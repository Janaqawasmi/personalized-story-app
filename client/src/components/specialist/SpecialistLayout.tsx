import { Outlet } from "react-router-dom";
import SpecialistNavBar from "./SpecialistNavBar";

/**
 * Wraps all authenticated specialist routes with a shared sub-navigation bar.
 */
export default function SpecialistLayout() {
  return (
    <>
      <SpecialistNavBar />
      <Outlet />
    </>
  );
}
