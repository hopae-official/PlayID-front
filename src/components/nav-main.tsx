"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavOpenMenusStore } from "@/stores/navOpenMenus";

interface NavMainProps {
  items: {
    id: string;
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    items?: {
      id: string;
      title: string;
      url: string;
    }[];
  }[];
}

type OpenMenus = { [key: string]: boolean };

export function NavMain({ items }: NavMainProps) {
  const location = useLocation();
  const { openMenus: openMenusStore, setOpenMenus: setOpenMenusStore } =
    useNavOpenMenusStore();

  const getInitialOpenMenus = () =>
    Object.fromEntries(items.map((item) => [item.id, true]));

  const [openMenus, setOpenMenus] = useState<OpenMenus>(getInitialOpenMenus());

  const handleToggle = (id: string) => {
    setOpenMenus((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      setOpenMenusStore(updated);
      return updated;
    });
  };

  useEffect(() => {
    setOpenMenus(openMenusStore);
  }, [openMenusStore]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>대회 관리</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.id}
            asChild
            open={openMenus[item.id]}
            onOpenChange={() => handleToggle(item.id)}
          >
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={item.title}>
                {item.items?.length ? (
                  <CollapsibleTrigger className="cursor-pointer">
                    <item.icon />
                    <span>{item.title}</span>
                  </CollapsibleTrigger>
                ) : (
                  <Link to={item.url} className="cursor-pointer">
                    <span>{item.title}</span>
                  </Link>
                )}
              </SidebarMenuButton>
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90 cursor-pointer">
                      <ChevronRight />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.id}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname === subItem.url}
                          >
                            <Link to={subItem.url} className="cursor-pointer">
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
