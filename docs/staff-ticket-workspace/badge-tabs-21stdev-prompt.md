# Badge Tabs 21st.dev Prompt

You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles.
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:

```tsx
badge-tabs.tsx
"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface BadgeTabItem {
  value: string;
  label: string;
  badge?: number;
  content?: React.ReactNode;
}

interface BadgeTabsProps {
  items?: BadgeTabItem[];
  defaultValue?: string;
  className?: string;
}

export default function BadgeTabs({
  items = [
    { value: "messages", label: "Messages", badge: 5, content: "You have 5 new messages." },
    { value: "tasks", label: "Tasks", badge: 12, content: "12 tasks pending review." },
    { value: "alerts", label: "Alerts", badge: 3, content: "3 new system alerts." },
  ],
  defaultValue,
  className,
}: BadgeTabsProps) {
  const [active, setActive] = React.useState(defaultValue || items[0].value);

  return (
    <div className={cn("flex flex-col items-center justify-center w-full", className)}>
      <Tabs value={active} onValueChange={setActive} className="w-full max-w-lg">
        {/* Tabs */}
        <TabsList className="relative flex gap-2 bg-background/30 p-2 rounded-xl border">
          {items.map((item) => {
            const isActive = item.value === active;
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                asChild
              >
                <motion.button
                  className={cn(
                    "relative flex-1 flex justify-between items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "text-white" : "text-foreground/80"
                  )}
                  whileHover={{ scale: 1.05 }}
                >
                  {/* Active background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-primary/10 rounded-lg z-0"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}

                  <span className="relative z-10">{item.label}</span>

                  {/* Badge */}
                  <AnimatePresence mode="popLayout">
                    {item.badge && item.badge > 0 && (
                      <motion.span
                        key={item.badge}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="ml-2 relative z-10 inline-flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full bg-blue-500 text-white text-xs font-bold"
                      >
                        {item.badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Content */}
        <div className="mt-4 w-full max-w-lg">
          {items.map((item) => (
            <TabsContent key={item.value} value={item.value}>
              <div className="p-4 bg-card rounded-lg">{item.content}</div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}


demo.tsx
import BadgeTabs, { BadgeTabItem } from "@/components/ui/badge-tabs";

const demoItems: BadgeTabItem[] = [
  {
    value: "messages",
    label: "Messages",
    badge: 5,
    content: (
      <div>
        <h2 className="font-bold text-lg">Messages</h2>
        <p>You have 5 new messages waiting for you.</p>
      </div>
    ),
  },
  {
    value: "tasks",
    label: "Tasks",
    badge: 12,
    content: (
      <div>
        <h2 className="font-bold text-lg">Tasks</h2>
        <p>There are 12 tasks pending your review.</p>
      </div>
    ),
  },
  {
    value: "alerts",
    label: "Alerts",
    badge: 3,
    content: (
      <div>
        <h2 className="font-bold text-lg">Alerts</h2>
        <p>You have 3 new system alerts.</p>
      </div>
    ),
  },
];

export default function DemoOne() {
  return (
    <BadgeTabs
      items={demoItems}
      defaultValue="tasks"
      className="mt-10"
    />
  );
}
```

Copy-paste these files for dependencies:

```tsx
originui/tabs
"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-lg bg-muted p-0.5 text-muted-foreground/70",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium outline-offset-2 transition-all hover:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:shadow-black/5",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
```

Install NPM dependencies:

```bash
framer-motion, @radix-ui/react-tabs
```

Implementation Guidelines
1. Analyze the component structure and identify all required dependencies
2. Review the component's argumens and state
3. Identify any required context providers or hooks and install them
4. Questions to Ask
- What data/props will be passed to this component?
- Are there any specific state management requirements?
- Are there any required assets (images, icons, etc.)?
- What is the expected responsive behavior?
- What is the best place to use this component in the app?

Steps to integrate
0. Copy paste all the code above in the correct directories
1. Install external dependencies
2. Fill image assets with Unsplash stock images you know exist
3. Use lucide-react icons for svgs or logos if component requires them
