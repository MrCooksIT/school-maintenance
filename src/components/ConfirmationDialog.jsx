// src/components/ConfirmationDialog.jsx
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';

const ConfirmationDialog = ({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "destructive"
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                        className={
                            variant === "destructive"
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : ""
                        }
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmationDialog;