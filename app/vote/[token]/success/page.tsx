import SuccessPageClient from "../SuccessPageClient";

export default async function SuccessPage({ params, searchParams }: { params: Promise<{ token: string }>, searchParams: { answers?: string } }) {
  const { token } = await params;
  const answersParam = searchParams?.answers;
  
  let answers: Record<number, any> = {};
  
  if (answersParam) {
    try {
      answers = JSON.parse(answersParam);
    } catch (e) {
      console.error("Failed to parse answers:", e);
    }
  }
  
  return <SuccessPageClient token={token} answers={answers} />;
}
