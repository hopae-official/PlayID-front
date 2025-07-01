import { SignIn } from "@clerk/clerk-react";

const CustomSignIn = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <SignIn
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={"/auth"}
      />
    </div>
  );
};

export default CustomSignIn;
