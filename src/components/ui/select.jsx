// src/components/ui/select.jsx
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// Define selectVariants
const selectVariants = {
    default: "bg-white text-black",
    primary: "bg-blue-500 text-white",
    secondary: "bg-gray-500 text-white",
};

// Define Select
const Select = SelectPrimitive.Root;

// Define SelectValue
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
            "flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
            className
        )}
        {...props}
    >
        <div className="flex items-center gap-2">
            {children}
        </div>
        <ChevronDown className="h-5 w-5 opacity-50" />
    </SelectPrimitive.Trigger>
));

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
        ref={ref}
        className={cn(
            "relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-8 pr-3 text-base outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            // Changed py-1.5 to py-2, text-sm to text-base
            className
        )}
        {...props}
    >
        <span className="absolute left-2 flex h-4 w-4 items-center justify-center"> {/* Increased check icon container */}
            <SelectPrimitive.ItemIndicator>
                <Check className="h-5 w-5" /> {/* Increased check icon size */}
            </SelectPrimitive.ItemIndicator>
        </span>

        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
));

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => (
    <SelectPrimitive.Portal>
        <SelectPrimitive.Content
            ref={ref}
            className={cn(
                "relative z-50 min-w-[10rem] overflow-hidden bg-white rounded-md border shadow-md animate-in fade-in-80",
                // Changed min-w-[8rem] to min-w-[10rem]
                position === "popper" &&
                "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                className
            )}
            position={position}
            {...props}
        >
            <SelectPrimitive.Viewport
                className={cn(
                    "p-2", // Changed p-1 to p-2
                    position === "popper" &&
                    "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
                )}
            >
                {children}
            </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
));

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
    <SelectPrimitive.Label
        ref={ref}
        className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
        {...props}
    />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
        ref={ref}
        className={cn("-mx-1 my-1 h-px bg-muted", className)}
        {...props}
    />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

const SelectGroup = SelectPrimitive.Group;
SelectGroup.displayName = SelectPrimitive.Group.displayName;

// Export all components
export {
    Select,
    SelectGroup,
    SelectPrimitive,
    SelectLabel,
    selectVariants,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectValue, // Add this line
};