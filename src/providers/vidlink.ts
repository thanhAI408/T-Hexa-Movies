import type { MovieProvider } from "@/providers/types";
import { vidsrcProvider } from "./vidsrc";

export const vidlinkProvider: MovieProvider = {
  ...vidsrcProvider,
  id: "vidlink",
  displayName: "VidLink Quốc Tế",
  baseUrl: "https://vidlink.pro",
};
