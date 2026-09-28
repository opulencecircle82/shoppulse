import type { ReactNode } from "react";
import UpdateAppNotice from "@/components/tech/UpdateAppNotice";

export default function TechLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <UpdateAppNotice />
    </>
  );
}
