# Insurance Card 21st.dev Prompt

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
insurance-card.tsx
// components/ui/insurance-card.tsx
import * as React from "react"
import { motion } from "framer-motion"
import { Clock, ClipboardCopy } from "lucide-react"

import { cn } from "@/lib/utils" // Assuming you have a `cn` utility from shadcn/ui
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

// Props interface for type safety and reusability
interface InsuranceCardProps {
  clientName: string;
  dateOfBirth: string;
  cityOfResidence: string;
  idNumber: string;
  policyNumber: string;
  insuranceType: string;
  vehicleInfo: string;
  expireDate: string;
  expireDuration: string;
  avatarSrc: string;
  qrCodeSrc: string;
  onUpdatePolicy?: () => void;
}

// A smaller, reusable component for displaying info items
const InfoItem = ({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-semibold text-sm text-card-foreground">{value}</span>
      {children}
    </div>
  </div>
);

export const InsuranceCard = ({
  clientName,
  dateOfBirth,
  cityOfResidence,
  idNumber,
  policyNumber,
  insuranceType,
  vehicleInfo,
  expireDate,
  expireDuration,
  avatarSrc,
  qrCodeSrc,
  onUpdatePolicy,
}: InsuranceCardProps) => {

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here for better UX
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Card className="w-full max-w-md rounded-2xl shadow-lg overflow-hidden border-primary/10">
        <CardHeader className="p-6 bg-muted/30">
          <div className="flex justify-between items-start gap-8">
            <div className="flex items-center gap-2">
              <Avatar className="h-14 w-14 border-2 border-background">
                <AvatarImage src={avatarSrc} alt={clientName} />
                <AvatarFallback>{clientName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-muted-foreground">
                   <Clock className="h-4 w-4" />
                   <span className="text-xs font-medium">Expire Date</span>
                </div>
                <p className="font-bold text-md text-foreground">
                  {expireDate} <span className="text-sm font-normal text-muted-foreground">({expireDuration})</span>
                </p>
              </div>
            </div>
            <img src={qrCodeSrc} alt="QR Code" className="h-16 w-16 rounded-md" />
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <InfoItem label="Client Name" value={clientName} />
            <InfoItem label="Date of Birth" value={dateOfBirth} />
            <InfoItem label="City of Residence" value={cityOfResidence} />
            <InfoItem label="ID Number" value={idNumber} />
            <InfoItem label="Policy Number" value={policyNumber}>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(policyNumber)}>
                    <ClipboardCopy className="h-4 w-4 text-muted-foreground" />
                </Button>
            </InfoItem>
            <InfoItem label="Type of Insurance" value={insuranceType} />
          </div>
          <div className="border-t border-border pt-4">
             <InfoItem label="Vehicle Information" value={vehicleInfo} />
          </div>
        </CardContent>

        <CardFooter className="p-6 bg-muted/30">
          <Button className="w-full" onClick={onUpdatePolicy}>
            Update a Policy
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

demo.tsx
// demo.tsx
import { InsuranceCard } from "@/components/ui/insurance-card";

// Main demo component to showcase the InsuranceCard
const InsuranceCardDemo = () => {

  // Sample data to populate the card
  const policyDetails = {
    clientName: "Jeremy Allen White",
    dateOfBirth: "09 Jan 1992",
    cityOfResidence: "Los Angeles, CA",
    idNumber: "756872004",
    policyNumber: "NPX 47208716",
    insuranceType: "Car Insurance",
    vehicleInfo: "Bentley Bentayga, 2019",
    expireDate: "21 Sep 2025",
    expireDuration: "2 years",
    // Replace with actual image URLs
    avatarSrc: "https://plus.unsplash.com/premium_photo-1739196926899-bd9c5a765ca3?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fHByb2ZpbGV8ZW58MHwyfDB8fHww&auto=format&fit=crop&q=60&w=900",
    qrCodeSrc: "https://ik.imagekit.io/fpxbgsota/Untitled.png?updatedAt=1759082788907",
  };

  const handleUpdate = () => {
    console.log("Update Policy button clicked!");
    // Add logic for updating the policy here
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <InsuranceCard
        {...policyDetails}
        onUpdatePolicy={handleUpdate}
      />
    </div>
  );
};

export default InsuranceCardDemo;
```

Copy-paste these files for dependencies:

```tsx
shadcn/card
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className,
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

```tsx
shadcn/avatar
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className,
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
```

```tsx
shadcn/button
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

Install NPM dependencies:

```bash
lucide-react, framer-motion, @radix-ui/react-avatar, @radix-ui/react-slot, class-variance-authority
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
