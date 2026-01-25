/**
 * Manages Java package installations using Maven.
 * Maps common package imports to Maven coordinates and keeps a local repository.
 */

import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';

// Persistent directory for user java libraries (JARs)
const USER_LIB_DIR = path.join(process.cwd(), 'user_libs', 'java');

// Mapping of common package prefixes to Maven coordinates
// Format: "package.prefix": "groupId:artifactId:version"
const PACKAGE_MAP = {
    // Spring Boot
    'org.springframework.boot': 'org.springframework.boot:spring-boot-starter:3.1.2',
    'org.springframework.web': 'org.springframework.boot:spring-boot-starter-web:3.1.2',
    'org.springframework.data': 'org.springframework.boot:spring-boot-starter-data-jpa:3.1.2',

    // Database Drivers
    'com.mysql.cj.jdbc': 'com.mysql:mysql-connector-j:8.0.33',
    'org.postgresql': 'org.postgresql:postgresql:42.6.0',
    'org.mongodb': 'org.mongodb:mongodb-driver-sync:4.10.2',

    // Utilities
    'com.google.gson': 'com.google.code.gson:gson:2.10.1',
    'org.apache.commons.lang3': 'org.apache.commons:commons-lang3:3.12.0',
    'org.apache.commons.io': 'commons-io:commons-io:2.13.0',
    'com.fasterxml.jackson.core': 'com.fasterxml.jackson.core:jackson-databind:2.15.2',
    'org.json': 'org.json:json:20230618',
    'org.jsoup': 'org.jsoup:jsoup:1.16.1',

    // Testing
    'org.junit': 'junit:junit:4.13.2',
    'org.junit.jupiter': 'org.junit.jupiter:junit-jupiter-api:5.9.3',
    'org.mockito': 'org.mockito:mockito-core:5.3.1',

    // Lombok (Needs annotation processing, might be tricky but adding anyway)
    'lombok': 'org.projectlombok:lombok:1.18.28',

    // Logging
    'org.slf4j': 'org.slf4j:slf4j-api:2.0.7',
    'ch.qos.logback': 'ch.qos.logback:logback-classic:1.4.8'
};

/**
 * Resolves imports to Maven coordinates and ensures JARs are present.
 * Returns the classpath segment to add to java/javac commands.
 */
export async function ensureJavaPackages(imports) {
    if (!imports || imports.length === 0) {
        return USER_LIB_DIR; // Even if empty, return dir just in case
    }

    // Ensure lib directory exists
    await fs.mkdir(USER_LIB_DIR, { recursive: true });

    // 1. Identify which artifacts we need based on imports
    const artifactsToInstall = new Set();

    for (const importName of imports) {
        // Find matching prefix in our map
        // We look for the longest matching prefix
        let bestMatch = null;
        let maxLen = 0;

        for (const [prefix, coordinate] of Object.entries(PACKAGE_MAP)) {
            if (importName.startsWith(prefix) ||
                // Handle wildcard imports or subpackages implicitly (e.g. import org.junit.Test matched by org.junit)
                (prefix.endsWith('.') ? importName.startsWith(prefix) : importName.startsWith(prefix + '.')) ||
                importName === prefix
            ) {
                if (prefix.length > maxLen) {
                    maxLen = prefix.length;
                    bestMatch = coordinate;
                }
            }
        }

        if (bestMatch) {
            artifactsToInstall.add(bestMatch);
        }
    }

    if (artifactsToInstall.size === 0) {
        // No known external packages
        return USER_LIB_DIR;
    }

    const artifactList = Array.from(artifactsToInstall);
    console.log(`[JavaPkgManager] Identified artifacts: ${artifactList.join(', ')}`);

    // 2. Install each artifact if not already cached (Maven handles caching, but we need to run the command)
    // We'll run them sequentially to avoid race conditions or overwhelming the system
    for (const artifact of artifactList) {
        try {
            await downloadArtifact(artifact);
        } catch (err) {
            console.warn(`[JavaPkgManager] Failed to download ${artifact}: ${err.message}`);
        }
    }

    // 3. Construct classpath
    // We need to include all JARs in USER_LIB_DIR.
    // NOTE: 'mvn dependency:get' puts files in ~/.m2/repository normally.
    // To make it easier for "-cp", we should ideally copy them to USER_LIB_DIR.
    // BUT 'mvn dependency:get' doesn't easily copy to a flat folder with transitive deps.
    //
    // ALTERNATIVE: 'mvn dependency:copy -Dartifact=... -DoutputDirectory=...'
    // This works great for single artifacts!

    // We'll scan the directory to build the classpath string
    const files = await fs.readdir(USER_LIB_DIR);
    const jarFiles = files.filter(f => f.endsWith('.jar')).map(f => path.join(USER_LIB_DIR, f));

    // Windows uses ';', Linux/Mac uses ':'
    const separator = process.platform === 'win32' ? ';' : ':';
    return jarFiles.join(separator);
}

function downloadArtifact(artifact) {
    return new Promise((resolve, reject) => {
        // Using dependency:copy to flatten dependencies into our folder is easier for -cp
        // Note: This relies on 'mvn' being in the system PATH.
        const mvnCmd = process.platform === 'win32' ? 'mvn.cmd' : 'mvn';

        // Command: mvn dependency:copy -Dartifact=g:a:v -DoutputDirectory=... -Dmdep.useBaseVersion=true
        const args = [
            'dependency:copy',
            `-Dartifact=${artifact}`,
            `-DoutputDirectory=${USER_LIB_DIR}`,
            '-Dmdep.useBaseVersion=true' // Strip timestamps from snapshot versions if any
        ];

        console.log(`[JavaPkgManager] Running: ${mvnCmd} ${args.join(' ')}`);

        const proc = spawn(mvnCmd, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true
        });

        let output = '';

        proc.stdout.on('data', d => output += d.toString());
        proc.stderr.on('data', d => output += d.toString());

        proc.on('close', (code) => {
            if (code === 0) {
                console.log(`[JavaPkgManager] Downloaded ${artifact}`);
                resolve();
            } else {
                reject(new Error(`Maven command failed (code ${code}): ${output.slice(-200)}`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to spawn maven: ${err.message}`));
        });
    });
}
