"use client";

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect, useRef, useState } from "react";
import { BlockNoteSchema, defaultBlockSpecs, locales } from "@blocknote/core";

// Add custom styles for dark mode
import "./editor-styles.css";

interface BlockNoteEditorProps {
    initialContent?: any[];
    onChange?: (content: any[]) => void;
    isDarkMode?: boolean;
    className?: string;
    readOnly?: boolean;
    placeholder?: string;
    onEditorReady?: (editor: any) => void;
    allowMedia?: boolean;
}

// Uploads a file and returns the URL to the uploaded file
async function uploadFile(file: File) {
    if (!file.type.startsWith('image/') && !file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
        return ''
    }

    let presigned_url = '';

    try {
        // First, get a presigned URL for the file
        const presignedUrlResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/file/presigned-url/create`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content_type: file.type
            })
        });

        if (!presignedUrlResponse.ok) {
            throw new Error('Failed to get presigned URL');
        }

        const presignedData = await presignedUrlResponse.json();

        console.log('Presigned url generated');
        presigned_url = presignedData.presigned_url;
    } catch (error) {
        console.error("Error getting presigned URL for file:", error);
    }

    if (!presigned_url) {
        // If we couldn't get a presigned URL, try direct upload to the backend
        try {
            console.log("Attempting direct upload to backend");

            // Create FormData for the file upload
            const formData = new FormData();
            formData.append('file', file, file.name);
            formData.append('content_type', file.type);

            // Upload directly to the backend
            const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/file/upload-local`, {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload audio to backend: ${uploadResponse.status}`);
            }

            const uploadData = await uploadResponse.json();
            const file_static_path = uploadData.static_url;

            const static_url = `${process.env.NEXT_PUBLIC_BACKEND_URL}${file_static_path}`;

            console.log('File uploaded successfully to backend');
            console.log(static_url);

            return static_url;
        } catch (error) {
            console.error('Error with direct upload to backend:', error);
            throw error;
        }
    } else {
        // Upload the file to S3 using the presigned URL
        try {
            let fileBlob = new Blob([file], { type: file.type });

            // Upload to S3 using the presigned URL with WAV content type
            const uploadResponse = await fetch(presigned_url, {
                method: 'PUT',
                body: fileBlob,
                headers: {
                    'Content-Type': file.type
                }
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload file to S3: ${uploadResponse.status}`);
            }

            console.log('File uploaded successfully to S3');
            console.log(uploadResponse);
            // Update the request body with the file information
            return uploadResponse.url
        } catch (error) {
            console.error('Error uploading file to S3:', error);
            throw error;
        }
    }
}

async function resolveFileUrl(url: string) {
    if (!url || !url.includes("?X-Amz-Algorithm=AWS4-HMAC-SHA256")) {
        return url;
    }

    if (url.includes(`${process.env.NEXT_PUBLIC_BACKEND_URL}/`)) {
        return url;
    }

    let uuid = url.split('/').pop()?.split('.')[0] || '';
    let fileType = url.split('.').pop()?.split('?')[0] || '';

    try {
        // Get presigned URL
        const presignedResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/file/presigned-url/get?uuid=${uuid}&file_extension=${fileType}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!presignedResponse.ok) {
            throw new Error('Failed to get presigned URL for file');
        }

        console.log('Presigned url for fetch generated');

        const { url } = await presignedResponse.json();

        return url;
    } catch (error) {
        console.error('Error fetching file:', error);
    }
}

export default function BlockNoteEditor({
    initialContent = [],
    onChange,
    isDarkMode = true, // Default to dark mode
    className = "",
    readOnly = false,
    placeholder = "Enter text or type '/' for commands",
    onEditorReady,
    allowMedia = true,
}: BlockNoteEditorProps) {
    const locale = locales["en"];

    const editorContainerRef = useRef<HTMLDivElement>(null);
    // Track if we're currently updating the editor content
    const isUpdatingContent = useRef(false);
    // Store the last content to avoid unnecessary updates
    const lastContent = useRef<any[]>([]);
    // Store the editor instance in a ref
    const editorRef = useRef<any>(null);

    // Extract blocks we don't want based on configuration
    let enabledBlocks;
    if (allowMedia) {
        // If media is allowed, exclude only these blocks
        const { table, file, ...allowedBlockSpecs } = defaultBlockSpecs;
        enabledBlocks = allowedBlockSpecs;
    } else {
        // If media is not allowed, also exclude all media blocks
        const { table, video, audio, file, image, ...allowedBlockSpecs } = defaultBlockSpecs;
        enabledBlocks = allowedBlockSpecs;
    }

    // Create a schema with only the allowed blocks
    const schema = BlockNoteSchema.create({
        blockSpecs: enabledBlocks,
    });

    // Creates a new editor instance with the custom schema
    const editor = useCreateBlockNote({
        initialContent: initialContent.length > 0 ? initialContent : undefined,
        uploadFile,
        resolveFileUrl,
        schema, // Use our custom schema with limited blocks
        dictionary: {
            ...locale,
            placeholders: {
                ...locale.placeholders,
                emptyDocument: placeholder,
            },
        },
    });

    // Store the editor instance in a ref for later use
    useEffect(() => {
        if (editor) {
            editorRef.current = editor;
        }
    }, [editor]);

    // Provide the editor instance to the parent component if onEditorReady is provided
    useEffect(() => {
        if (onEditorReady && editor) {
            onEditorReady(editor);
        }
    }, [editor, onEditorReady]);

    // Update editor content when initialContent changes
    useEffect(() => {
        if (editor && initialContent && initialContent.length > 0) {
            // Set flag to prevent triggering onChange during programmatic update
            isUpdatingContent.current = true;

            try {
                // Only replace blocks if the content has actually changed
                const currentContentStr = JSON.stringify(editor.document);
                const newContentStr = JSON.stringify(initialContent);

                if (currentContentStr !== newContentStr) {
                    editor.replaceBlocks(editor.document, initialContent);
                    lastContent.current = initialContent;
                }
            } catch (error) {
                console.error("Error updating editor content:", error);
            } finally {
                // Reset flag after update
                isUpdatingContent.current = false;
            }
        }
    }, [editor, initialContent]);

    // Handle content changes with debouncing to avoid rapid state updates
    useEffect(() => {
        if (onChange && editor) {
            const handleChange = () => {
                // Prevent handling changes if we're currently updating content
                if (isUpdatingContent.current) return;

                const currentContent = editor.document;
                onChange(currentContent);
            };

            // Add change listener
            editor.onEditorContentChange(handleChange);
        }
    }, [editor, onChange]);

    // Add a method to focus the editor
    useEffect(() => {
        if (editor && editorRef.current) {
            // Add a focus method to the editor ref
            // Use a different name for the method to avoid potential name conflicts
            editorRef.current.focusEditor = () => {
                try {
                    // Check if we're already focused to prevent recursion
                    const activeElement = document.activeElement;
                    const editorElement = editorContainerRef.current?.querySelector('[contenteditable="true"]');

                    // Only focus if we're not already focused
                    if (editorElement && activeElement !== editorElement) {
                        editor.focus();
                    }
                } catch (err) {
                    console.error("Error focusing editor:", err);
                }
            };
        }
    }, [editor]);

    return (
        <div
            ref={editorContainerRef}
            className={`h-full dark-editor-container ${className}`}
            // Add click handler to prevent event propagation
            onClick={(e) => {
                e.stopPropagation();
            }}
            // Prevent mousedown from bubbling up which can cause focus issues
            onMouseDown={(e) => {
                e.stopPropagation();
            }}
        >
            <BlockNoteView
                editor={editor}
                theme={isDarkMode ? "dark" : "light"}
                className={isDarkMode ? "dark-editor" : ""}
                editable={!readOnly}
            />
        </div>
    );
} 