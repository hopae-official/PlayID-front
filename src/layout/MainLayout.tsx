import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <SidebarProvider className="flex flex-col">
      <div className="flex flex-1">
        <AppSidebar />
        <Outlet />
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
