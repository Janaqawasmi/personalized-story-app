import { Outlet } from "react-router-dom";

/**
 * Wraps authenticated specialist routes (outlet only; secondary nav removed).
 */
export default function SpecialistLayout() {
  return <Outlet />;
}
