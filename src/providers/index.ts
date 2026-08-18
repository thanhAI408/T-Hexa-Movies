import type { MovieProvider } from "@/providers/types";
import { kkphimProvider } from "@/providers/kkphim";
import { nguoncProvider } from "@/providers/nguonc";
import { ophimProvider } from "@/providers/ophim";
import { vsmovProvider } from "@/providers/vsmov";
import type { ProviderId } from "@/types/catalog";

export const providers = [
  vsmovProvider,
  ophimProvider,
  nguoncProvider,
  kkphimProvider,
] satisfies MovieProvider[];

const providerMap = new Map<ProviderId, MovieProvider>(
  providers.map((provider) => [provider.id, provider]),
);

export function getProvider(id: ProviderId) {
  const provider = providerMap.get(id);
  if (!provider) throw new Error(`Unknown provider: ${id}`);
  return provider;
}
