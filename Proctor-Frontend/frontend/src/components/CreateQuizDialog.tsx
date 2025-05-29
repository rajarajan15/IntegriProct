import React from 'react';

function CreateQuizDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    console.log("Minimal CreateQuizDialog Rendered");
    return (
        <dialog open={open}>
            <h1>Minimal Dialog</h1>
        </dialog>
    );
}

export default CreateQuizDialog; 