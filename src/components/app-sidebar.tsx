import * as React from "react";
import {
  AudioWaveform,
  CircleUserRound,
  Frame,
  GalleryVerticalEnd,
  Gamepad2,
  Map,
  PieChart,
  Trophy,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "./team-switcher";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: CircleUserRound,
      plan: "Free",
    },
  ],
  navMain: [
    // {
    //   id: "dashboard",
    //   title: "대시보드",
    //   url: "/dashboard",
    //   icon: ChartColumnBig,
    //   isActive: true,
    // },
    // {
    //   id: "settings",
    //   title: "대회 설정",
    //   url: "/settings",
    //   icon: Settings2,
    // },
    // {
    //   title: "모집 관리",
    //   url: "#",
    //   icon: CircleUserRound,
    //   items: [
    //     {
    //       id: "applicants",
    //       title: "신청자 목록",
    //       url: "/applicants",
    //     },
    //     {
    //       id: "roster",
    //       title: "로스터",
    //       url: "/roster",
    //     },
    //   ],
    // },
    {
      id: "bracket-management",
      title: "경기 관리",
      url: "#",
      icon: Gamepad2,
      items: [
        {
          id: "bracket",
          title: "경기 목록(대진표)",
          url: "/bracket",
        },
        // {
        //   id: "referee",
        //   title: "심판 배정",
        //   url: "/referee",
        // },
        // {
        //   id: "checkin",
        //   title: "체크인",
        //   url: "/checkin",
        // },
      ],
    },
    {
      id: "result-management",
      title: "결과 관리",
      url: "#",
      icon: Trophy,
      items: [
        {
          id: "result",
          title: "경기 결과",
          url: "/result",
        },
        // {
        //   id: "winner",
        //   title: "우승자 관리",
        //   url: "/winner",
        // },
      ],
    },
    // {
    //   id: "notice",
    //   title: "공지 센터",
    //   url: "/notice",
    //   icon: BellPlus,
    // },
  ],
  navSecondary: [
    // {
    //   id: "rulebook",
    //   title: "룰북",
    //   url: "/rulebook",
    //   icon: BookOpenText,
    // },
    // {
    //   id: "inquiry",
    //   title: "문의하기",
    //   url: "/inquiry",
    //   icon: MessageCircleQuestion,
    // },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
