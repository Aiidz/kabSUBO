import { KabsuboHome } from "@/app/components/kabsubo-home";

type ResultsPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const { q = "" } = await searchParams;

  return <KabsuboHome initialQuery={q} />;
}
