import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { getToken } from "@/utils/token";
import { useEffect } from "react";
import { CompetitionProvider } from "@/contexts/CompetitionContext";

const MainLayout = () => {
  const token = getToken();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/sign-in");
    }
  }, [token]);

  return (
    <CompetitionProvider>
      <SidebarProvider className="flex flex-col">
        <div className="flex flex-1">
          <AppSidebar />
          <Outlet />
        </div>
      </SidebarProvider>
    </CompetitionProvider>
  );
};

export default MainLayout;
