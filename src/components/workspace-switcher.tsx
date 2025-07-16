"use client";
import * as React from "react";
import {ChevronsUpDown} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,} from "@/components/ui/sidebar";


const getWorkspaces = () => {
    return [
        {
            id: '1',
            name: "Acme Inc",
            plan: "Enterprise",
        },
        {
            id: '2',
            name: "Acme Corp.",
            plan: "Enterprise",
        },
        {
            id: '3',
            name: "Evil Corp.",
            plan: "Enterprise",
        },
    ]
}

export function WorkspaceSwitcher() {
    const {isMobile} = useSidebar();
    const workspaces = getWorkspaces();
    const [activeWorkspace, setActiveWorkspace] = React.useState(workspaces[0]);
    if (!activeWorkspace) {
        return null;
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >

                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{activeWorkspace.name}</span>
                                <span className="truncate text-xs">{activeWorkspace.plan}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto"/>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                            Workspaces
                        </DropdownMenuLabel>
                        {workspaces.map((workspace) => (
                            <DropdownMenuItem
                                key={workspace.name}
                                onClick={() => setActiveWorkspace(workspace)}
                                className="gap-2 p-2"
                            >

                                {workspace.name}
                            </DropdownMenuItem>
                        ))}


                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
