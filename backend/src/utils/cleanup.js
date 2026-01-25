const Docker = require('dockerode');
const docker = new Docker();

async function cleanupOrphanedContainers() {
    try {
        const containers = await docker.listContainers({ all: true });

        const teachgridContainers = containers.filter(c =>
            c.Names.some(name => name.includes('teachgrid_'))
        );

        for (const containerInfo of teachgridContainers) {
            try {
                const container = docker.getContainer(containerInfo.Id);

                const created = new Date(containerInfo.Created * 1000);
                const age = Date.now() - created.getTime();

                if (age > 10 * 60 * 1000) {
                    console.log(`Cleaning up old container: ${containerInfo.Names[0]}`);

                    if (containerInfo.State === 'running') {
                        await container.kill();
                    }

                    await container.remove({ force: true });
                }
            } catch (err) {
                console.error(`Error cleaning container ${containerInfo.Id}:`, err.message);
            }
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

module.exports = { cleanupOrphanedContainers };
