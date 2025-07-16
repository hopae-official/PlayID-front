"use client";
import {ChevronsUpDown} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,} from "@/components/ui/sidebar";
import {useCompetition} from "@/contexts/CompetitionContext";

export function WorkspaceSwitcher() {
    const {isMobile} = useSidebar();
    const {workspaces, selectedWorkspace, changeWorkspace} = useCompetition();

    if (!selectedWorkspace) {
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
                                <span className="truncate font-medium">{selectedWorkspace.name}</span>
                                <span className="truncate text-xs">{selectedWorkspace.plan}</span>
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
                                onClick={() => changeWorkspace(workspace)}
                                className={`gap-2 p-2 ${
                                    selectedWorkspace.id === workspace.id 
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                                        : ''
                                }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span>{workspace.name}</span>
                                    {selectedWorkspace.id === workspace.id && (
                                        <span className="ml-2 text-xs">✓</span>
                                    )}
                                </div>
                            </DropdownMenuItem>
                        ))}


                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
