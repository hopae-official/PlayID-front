import { SignIn, useUser } from "@clerk/clerk-react";
import SidebarLayout from "@/layout/SidebarLayout";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const Home = () => {
  const { isSignedIn } = useUser();
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (index: number) => {
    setTabIndex(index);
  };

  return (
    <>
      {isSignedIn ? (
        <SidebarLayout tabIndex={tabIndex} onTabChange={handleTabChange}>
          {tabIndex === 0 && (
            <div className="flex flex-1 flex-col gap-4 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-bold">참가자 관리</h1>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>참가자</CardTitle>
                    <CardDescription>참가자명</CardDescription>
                    <CardContent>
                      <Input type="text" placeholder="참가자명" />
                    </CardContent>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>참가자</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>참가자</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </div>
          )}
          {tabIndex === 1 && (
            <div className="flex flex-1 flex-col gap-4 p-4">
              <Card>
                <CardHeader>
                  <CardTitle>대진표</CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}
          {tabIndex === 2 && (
            <div className="flex flex-1 flex-col gap-4 p-4">
              <Card>
                <CardHeader>
                  <CardTitle>경기 결과 관리</CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}
        </SidebarLayout>
      ) : (
        <div className="flex flex-col items-center justify-center h-screen gap-20">
          <h1 className="text-4xl font-bold">
            Hopae 관리자 대시보드에 오신 것을 환영합니다.
          </h1>
          <SignIn />
        </div>
      )}
    </>
  );
};

export default Home;
