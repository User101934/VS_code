import React, { useState, useMemo } from "react";
import { Search as SearchIcon, ChevronRight, ChevronDown, FileCode } from "lucide-react";

export default function SearchView({ files, onFileOpen }) {
    const [query, setQuery] = useState("");

    const results = useMemo(() => {
        if (!query || query.length < 2) return [];

        const searchResults = [];

        const searchRecursive = (items, path = "") => {
            items.forEach(item => {
                if (item.isDir) {
                    searchRecursive(item.children || [], `${path}${item.name}/`);
                } else {
                    const content = item.content || "";
                    const lines = content.split("\n");
                    const matches = [];

                    lines.forEach((line, index) => {
                        if (line.toLowerCase().includes(query.toLowerCase())) {
                            matches.push({
                                line: index + 1,
                                text: line.trim()
                            });
                        }
                    });

                    if (matches.length > 0) {
                        searchResults.push({
                            file: item,
                            path: `${path}${item.name}`,
                            matches
                        });
                    }
                }
            });
        };

        searchRecursive(files);
        return searchResults;
    }, [files, query]);

    return (
        <div className="search-view">
            <div className="search-input-container">
                <input
                    type="text"
                    placeholder="Search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="search-results">
                {results.length === 0 && query.length >= 2 && (
                    <div className="no-results">No results found</div>
                )}
                {results.map((res, i) => (
                    <div key={i} className="search-result-group">
                        <div
                            className="search-result-file"
                            onClick={() => onFileOpen(res.file)}
                        >
                            <ChevronDown size={14} />
                            <FileCode size={14} />
                            <span className="file-name">{res.file.name}</span>
                            <span className="file-path">{res.path}</span>
                        </div>
                        <div className="search-result-matches">
                            {res.matches.map((match, j) => (
                                <div
                                    key={j}
                                    className="search-match-item"
                                    onClick={() => onFileOpen(res.file)}
                                >
                                    <span className="line-number">{match.line}</span>
                                    <span className="match-text">{match.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
