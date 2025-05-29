import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditor } from '@/context/EditorContext';
import Block from './Block';
import BlockMenu from './BlockMenu';

interface Position {
    top: number;
    left: number;
}

const Editor: React.FC = () => {
    const { blocks, addBlock, updateBlockContent } = useEditor();
    const [showBlockMenu, setShowBlockMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<Position>({ top: 0, left: 0 });
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const addButtonRef = useRef<HTMLButtonElement>(null);

    // Close block menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
                setShowBlockMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAddBlock = useCallback(() => {
        // Show block menu instead of directly adding a paragraph block
        if (addButtonRef.current) {
            const rect = addButtonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY + 10,
                left: rect.left + window.scrollX,
            });
            setActiveBlockId(null);
            setShowBlockMenu(true);
        }
    }, []);

    const handleSelectBlockType = useCallback((type) => {
        if (activeBlockId) {
            // Update the existing block type
            updateBlockContent(activeBlockId, '');
            setActiveBlockId(null);
        } else {
            // Add a new block of selected type
            addBlock(type);
        }
        setShowBlockMenu(false);
    }, [activeBlockId, addBlock, updateBlockContent]);

    return (
        <div
            ref={editorRef}
            className="editor-container w-full max-w-3xl mx-auto pt-20 pb-40 mirror-content"
        >
            <div className="space-y-1 mirror-content">
                {blocks.map((block) => (
                    <div
                        key={block.id}
                        data-block-id={block.id}
                        className="mirror-content"
                        style={{ marginLeft: `${(block.indent || 0) * 1.5}rem` }}
                    >
                        <Block
                            id={block.id}
                            type={block.type}
                            content={block.content}
                            onShowBlockMenu={(position, blockId) => {
                                setMenuPosition(position);
                                setActiveBlockId(blockId);
                                setShowBlockMenu(true);
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Add block button */}
            <div className="mt-4 flex justify-center mirror-content">
                <Button
                    ref={addButtonRef}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                    onClick={handleAddBlock}
                >
                    <Plus className="h-4 w-4" />
                    <span>Add block</span>
                </Button>
            </div>

            {/* Block menu for slash commands and add block */}
            {showBlockMenu && (
                <BlockMenu
                    onSelectBlockType={handleSelectBlockType}
                    onClose={() => setShowBlockMenu(false)}
                    position={menuPosition}
                />
            )}
        </div>
    );
};

export default Editor;
