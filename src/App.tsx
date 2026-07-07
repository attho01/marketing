import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Circle,
  Sparkles,
  Copy,
  Download,
  Award,
  TrendingUp,
  Coins,
  ChevronRight,
  User,
  RefreshCw,
  Layout,
  BookOpen,
  Zap,
  Users,
  Target,
  Shield,
  ArrowRight,
  Clock,
  Compass,
  Flame,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// Core interface for chatbot messages
interface ChatMessage {
  id: string;
  sender: "assistant" | "user";
  text: string;
  timestamp: Date;
}

// Default static examples for Step 1
const STEP1_DEFAULT_EXAMPLES = [
  "고해상도 무선 액티브 노이즈 캔슬링 헤드폰",
  "민감성 피부를 위한 식물성 비건 수분 크림",
  "바쁜 직장인을 위한 정기 구독형 저염 건강 식단 도시락",
  "페트병을 업사이클링한 고기능성 방수 캐주얼 백팩",
  "AI 기반 맞춤형 생산성 및 시간 관리 다이어리 앱",
];

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"chat" | "proposal">("chat");

  // Collected criteria
  const [productFeatures, setProductFeatures] = useState<string>("");
  const [target, setTarget] = useState<string>("");
  const [budget, setBudget] = useState<string>("");

  // Dynamic suggestions fetched from API for target and budget
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);

  // Proposal State
  const [proposal, setProposal] = useState<string>("");
  const [isGeneratingProposal, setIsGeneratingProposal] = useState<boolean>(false);

  // Custom Input State
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [customInputValue, setCustomInputValue] = useState<string>("");

  // Clarification state for target
  const [isClarifyingTarget, setIsClarifyingTarget] = useState<boolean>(false);
  const [clarifiedCount, setClarifiedCount] = useState<number>(0);
  const [tempTarget, setTempTarget] = useState<string>("");

  // Copy & Export Status
  const [copied, setCopied] = useState<boolean>(false);
  const [isLanding, setIsLanding] = useState<boolean>(true);

  // Gemini API Key State
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return localStorage.getItem("GEMINI_USER_API_KEY") || "";
  });
  const [apiKeyValue, setApiKeyValue] = useState<string>(() => {
    return localStorage.getItem("GEMINI_USER_API_KEY") || "";
  });
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "success" | "error">("idle");
  const [verifyMessage, setVerifyMessage] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Initial greeting from Director
  useEffect(() => {
    setMessages([
      {
        id: "greet-1",
        sender: "assistant",
        text: `반갑습니다! 저는 10년 차 브랜드 마케팅 디렉터입니다. 
귀사의 제품이 시장을 뒤흔들 수 있도록 서로 다른 전략적 축(포지셔닝)을 가진 독창적인 캠페인 기획안 초안을 설계해 드리겠습니다.

성공적인 마케팅 전략 수립을 위해, 먼저 귀사 **[제품/브랜드의 핵심 특징이나 스펙]**을 선택해 주시거나 아래 입력창을 통해 직접 설명해 주세요.`,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Security Gate: Ensure no one bypasses API Key approval
  useEffect(() => {
    if (!isLanding && !userApiKey) {
      setIsLanding(true);
      setVerifyStatus("error");
      setVerifyMessage("캠페인 기획을 시작하려면 Gemini API Key 승인이 필요합니다. 아래 'API 설정' 영역에서 유효한 Gemini API Key를 입력하고 초록색 버튼을 통해 검증 및 승인을 받아주세요.");
      setTimeout(() => {
        const apiSection = document.getElementById("api-settings");
        if (apiSection) {
          apiSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);
    }
  }, [isLanding, userApiKey]);

  const handleStartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!userApiKey) {
      setVerifyStatus("error");
      setVerifyMessage("캠페인 기획을 시작하려면 Gemini API Key 승인이 필요합니다. 아래 'API 설정' 영역에서 API Key를 입력하고 초록색 [API Key 검증 및 승인 저장] 버튼을 통해 검증 및 승인을 완료해 주세요.");
      
      const apiSection = document.getElementById("api-settings");
      if (apiSection) {
        apiSection.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          const keyInput = document.querySelector('input[placeholder*="Gemini API Key"]');
          if (keyInput) {
            (keyInput as HTMLInputElement).focus();
          }
        }, 800);
      }
    } else {
      setIsLanding(false);
    }
  };

  const verifyAndSaveApiKey = async (keyInput: string) => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setVerifyStatus("error");
      setVerifyMessage("API Key를 입력해 주세요.");
      return;
    }

    setIsVerifying(true);
    setVerifyStatus("idle");
    setVerifyMessage("");

    try {
      const response = await fetch("/api/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("GEMINI_USER_API_KEY", trimmed);
        setUserApiKey(trimmed);
        setVerifyStatus("success");
        setVerifyMessage("Gemini API Key가 정상적으로 승인 및 활성화되었습니다! 이제 모든 마케팅 기획서 작성 단계에 해당 키가 우선 적용됩니다.");
      } else {
        setVerifyStatus("error");
        setVerifyMessage(data.error || "API Key 승인 실패. 유효하지 않은 키이거나 일시적 통신 오류입니다.");
      }
    } catch (err: any) {
      setVerifyStatus("error");
      setVerifyMessage("인증 서버와의 통신에 실패했습니다: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const useDefaultServerKey = () => {
    localStorage.removeItem("GEMINI_USER_API_KEY");
    setUserApiKey("");
    setVerifyStatus("idle");
    setVerifyMessage("설정이 서버 기본 API Key 사용으로 안전하게 전환되었습니다.");
  };

  // Fetch dynamic examples for Step 2 and Step 3
  const loadDynamicSuggestions = async (currentStep: number, features: string, tgt?: string) => {
    setIsLoadingSuggestions(true);
    setDynamicSuggestions([]);
    try {
      const response = await fetch("/api/generate-examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: currentStep,
          productFeatures: features,
          target: tgt,
          apiKey: userApiKey,
        }),
      });
      const data = await response.json();
      if (data.examples && Array.isArray(data.examples)) {
        setDynamicSuggestions(data.examples);
      } else {
        setDynamicSuggestions([]);
      }
    } catch (e) {
      console.error("Failed to load suggestions:", e);
      // Fallback in case of server/API error
      if (currentStep === 2) {
        setDynamicSuggestions([
          "2030 가치소비를 지향하는 1인 가구 직장인",
          "합리적인 소비와 실용성을 중시하는 대학생",
          "최신 디바이스와 기술 트렌드에 민감한 얼리어답터",
          "가족의 건강과 친환경 라이프를 챙기는 3040 부모님",
        ]);
      } else {
        setDynamicSuggestions([
          "300만원 (인스타그램/틱톡 마이크로 인플루언서 중심 소규모 예산)",
          "1,500만원 (메타 광고 및 중형 인플루언서 중심 중규모 예산)",
          "5,000만원 (종합 미디어 광고 및 대규모 인플루언서 협업)",
          "1억 5,000만원 (온오프라인 팝업을 연계한 대형 캠페인 예산)",
        ]);
      }
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Check if target is too brief and needs a clarification
  const checkTargetBriefness = (value: string): boolean => {
    const trimmed = value.trim();
    return trimmed.length <= 5 || trimmed === "20대" || trimmed === "직장인" || trimmed === "학생";
  };

  // Main input handle
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message to chat
    const userMsgId = `user-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: "user",
        text,
        timestamp: new Date(),
      },
    ];
    setMessages(newMessages);
    setShowCustomInput(false);
    setCustomInputValue("");

    // Simulate typing
    setIsTyping(true);

    // Multi-criteria input checking in the FIRST message as exception handling
    if (step === 1 && messages.length === 1) {
      const containsBudget = /만원|예산|원|억/i.test(text);
      const containsTarget = /대|타겟|소비자|고객|직장인|학생|부모/i.test(text);

      if (containsBudget && containsTarget && text.length > 30) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsTyping(false);

        setProductFeatures(text.substring(0, 40) + "...");
        setTarget("입력 정보 기반 분석 타겟");
        setBudget("입력 정보 기반 분석 예산");

        generateCampaignProposal(text, "입력 정보 기반 분석 타겟", "입력 정보 기반 분석 예산", newMessages);
        return;
      }
    }

    // Process steps
    if (step === 1) {
      setProductFeatures(text);
      await new Promise((resolve) => setTimeout(resolve, 800));

      setStep(2);
      setIsTyping(false);

      setMessages((prev) => [
        ...prev,
        {
          id: `step2-prompt-${Date.now()}`,
          sender: "assistant",
          text: `선택하신 제품 특징: **"${text}"**(을)를 바탕으로, 타겟 오디언스 그룹들을 정교하게 분석했습니다. 

이번 브랜드 캠페인에서 정조준할 **[핵심 오디언스 타겟]**을 골라주세요. 맞춤형 추천 항목을 선별했으며, 목록에 없다면 직접 입력을 통해 알려주실 수 있습니다.`,
          timestamp: new Date(),
        },
      ]);
      loadDynamicSuggestions(2, text);
    } else if (step === 2) {
      if (isClarifyingTarget) {
        setIsClarifyingTarget(false);
        const combinedTarget = `${tempTarget} (${text})`;
        setTarget(combinedTarget);
        setTempTarget("");

        await new Promise((resolve) => setTimeout(resolve, 800));
        setStep(3);
        setIsTyping(false);

        setMessages((prev) => [
          ...prev,
          {
            id: `step3-prompt-${Date.now()}`,
            sender: "assistant",
            text: `타겟 오디언스가 구체화되었습니다: **"${combinedTarget}"** 

마지막으로, 이번 캠페인을 실행할 구체적인 **[예산 규모]**를 설정해 주세요. 예산에 부합하는 현실적이고 명확한 채널 믹스를 산출해 기획안에 적용하겠습니다.`,
            timestamp: new Date(),
          },
        ]);
        loadDynamicSuggestions(3, productFeatures, combinedTarget);
      } else {
        if (checkTargetBriefness(text) && clarifiedCount < 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          setIsClarifyingTarget(true);
          setClarifiedCount(1);
          setTempTarget(text);
          setIsTyping(false);

          setMessages((prev) => [
            ...prev,
            {
              id: `clarify-prompt-${Date.now()}`,
              sender: "assistant",
              text: `선택하신 타겟 **"${text}"**은 마케팅을 전개하기에 다소 광범위할 수 있습니다. 
혹시 타겟 오디언스의 구체적인 라이프스타일이나 세부 직군이 있으신가요? 

(예: '트렌디한 아이템을 공유하는 대학생', '바쁜 일상 중 영양 균형을 찾는 자취생', '출퇴근 길 소확행을 찾는 30대 회사원' 등 조금만 더 상세하게 보완해 주시면 기획안의 퀄리티가 비약적으로 올라갑니다!)`,
              timestamp: new Date(),
            },
          ]);
        } else {
          setTarget(text);
          await new Promise((resolve) => setTimeout(resolve, 800));
          setStep(3);
          setIsTyping(false);

          setMessages((prev) => [
            ...prev,
            {
              id: `step3-prompt-${Date.now()}`,
              sender: "assistant",
              text: `좋습니다! 정조준할 오디언스 타겟: **"${text}"**(으)로 확정했습니다. 

마지막 단계입니다. 이번 캠페인을 실행할 구체적인 **[예산 규모]**를 설정해 주세요. 예산에 부합하는 정량적이고 효과적인 채널 믹스 가이드를 기획안에 매핑해 드리겠습니다.`,
              timestamp: new Date(),
            },
          ]);
          loadDynamicSuggestions(3, productFeatures, text);
        }
      }
    } else if (step === 3) {
      setBudget(text);
      generateCampaignProposal(productFeatures, target, text, newMessages);
    } else if (step === 4) {
      reviseCampaignProposal(text, newMessages);
    }
  };

  // Core API Call to generate full proposal
  const generateCampaignProposal = async (
    features: string,
    tgt: string,
    bud: string,
    currentMessages: ChatMessage[]
  ) => {
    setIsTyping(true);
    setIsGeneratingProposal(true);
    setActiveTab("proposal");

    const loadingMsgId = `loading-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: loadingMsgId,
        sender: "assistant",
        text: `비즈니스 3대 핵심 요건(제품 특징, 공략 타겟, 예산)을 모두 확보했습니다. 

**제품**: ${features}
**타겟**: ${tgt}
**예산**: ${bud}

10년 차 마케팅 디렉터로서의 통찰력을 발휘하여 서로 다른 전략적 포지셔닝 축을 가진 독창적인 3개 캠페인안과 고정 채널 믹스가 반영된 기획안 초안을 생성하고 있습니다. 잠시만 기다려 주십시오...`,
        timestamp: new Date(),
      },
    ]);

    try {
      const response = await fetch("/api/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productFeatures: features,
          target: tgt,
          budget: bud,
          apiKey: userApiKey,
        }),
      });

      const data = await response.json();

      if (response.ok && data.proposal) {
        setProposal(data.proposal);
        setStep(4);

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== loadingMsgId),
          {
            id: `proposal-complete-${Date.now()}`,
            sender: "assistant",
            text: `정조준한 타겟과 예산 규모 분석에 따른 전략적 캠페인 기획안 초안이 마침내 수립되었습니다! 우측 패널(또는 기획서 탭)에서 깔끔하게 정리된 완성본을 상시 열람하실 수 있습니다.

**[캠페인 포지셔닝 축 적용 현황]**
- 제1안: 감성/공감 축 적용
- 제2안: 기능/성능 축 적용
- 제3안: 사회적 증거/트렌드 축 적용

제시해 드린 기획안의 특정 컨셉의 톤앤매너, 슬로건, 마케팅 채널, 예산 배분 등을 보정하고 싶으시면 언제든 아래 입력창에 수정 요청 사항을 남겨주세요. 기존의 성공적인 기획 구조를 유지하면서 **해당하는 특정 부분만 즉시 디테일하게 재작성**해 드립니다.`,
            timestamp: new Date(),
          },
        ]);
      } else {
        throw new Error(data.error || "Failed to receive proposal text.");
      }
    } catch (e: any) {
      console.error("Proposal generation failed:", e);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== loadingMsgId),
        {
          id: `proposal-failed-${Date.now()}`,
          sender: "assistant",
          text: `기획안 생성 중 예상치 못한 network 오류가 발생했습니다. 아래 다시 시도하기 버튼을 눌러 다시 기획안을 도출하거나, 이전 단계를 다시 체크할 수 있습니다. (오류: ${e.message})`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      setIsGeneratingProposal(false);
    }
  };

  // Core API Call to revise specific part of the proposal
  const reviseCampaignProposal = async (feedbackText: string, currentMessages: ChatMessage[]) => {
    setIsTyping(true);
    setIsGeneratingProposal(true);
    setActiveTab("proposal");

    const loadingMsgId = `revising-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: loadingMsgId,
        sender: "assistant",
        text: `알겠습니다. 전달해주신 수정 피드백 \`"${feedbackText}"\`(을)를 반영하여 캠페인 기획서 초안 중 일부를 정밀 조정하는 작업에 착수하겠습니다. 

다른 컨셉안들의 일관성은 완벽히 유지하면서 요청하신 특정 파트만 베테랑 디렉터의 시각으로 날카롭게 다듬어 오겠습니다. 잠시만 대기해 주세요.`,
        timestamp: new Date(),
      },
    ]);

    try {
      const response = await fetch("/api/revise-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalProposal: proposal,
          feedback: feedbackText,
          productFeatures,
          target,
          budget,
          apiKey: userApiKey,
        }),
      });

      const data = await response.json();

      if (response.ok && data.proposal) {
        setProposal(data.proposal);

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== loadingMsgId),
          {
            id: `proposal-revised-${Date.now()}`,
            sender: "assistant",
            text: `요청하신 피드백이 완벽하게 업데이트되었습니다! 기획서 대시보드에 수정이 완료된 최신 개정판을 반영해 두었습니다. 

추가로 보완하고 싶으신 부분(톤앤매너, 채널 믹스 조정 등)이 있으시면 언제든지 편하게 다시 말씀해 주세요.`,
            timestamp: new Date(),
          },
        ]);
      } else {
        throw new Error(data.error || "Failed to revise proposal text.");
      }
    } catch (e: any) {
      console.error("Proposal revision failed:", e);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== loadingMsgId),
        {
          id: `revision-failed-${Date.now()}`,
          sender: "assistant",
          text: `기획안 수정 반영 중 오류가 발생했습니다. 피드백을 다시 전송하거나 하단 입력창을 다시 사용해 주십시오. (오류: ${e.message})`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      setIsGeneratingProposal(false);
    }
  };

  // Handle preset option selection
  const handleSelectOption = (value: string) => {
    if (value === "custom") {
      setShowCustomInput(true);
    } else {
      handleSendMessage(value);
    }
  };

  // Helper to copy proposal to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to download proposal as file
  const downloadAsTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([proposal], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `brand_campaign_proposal_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Reset entire flow
  const resetFlow = () => {
    if (window.confirm("지금까지의 진행 상황이 모두 리셋됩니다. 새로운 브랜드 캠페인 기획을 시작하시겠습니까?")) {
      setStep(1);
      setProductFeatures("");
      setTarget("");
      setBudget("");
      setDynamicSuggestions([]);
      setProposal("");
      setClarifiedCount(0);
      setIsClarifyingTarget(false);
      setTempTarget("");
      setMessages([
        {
          id: "greet-1",
          sender: "assistant",
          text: `반갑습니다! 저는 10년 차 브랜드 마케팅 디렉터입니다. 
귀사의 제품이 시장을 뒤흔들 수 있도록 서로 다른 전략적 축(포지셔닝)을 가진 독창적인 캠페인 기획안 초안을 설계해 드리겠습니다.

성공적인 마케팅 전략 수립을 위해, 먼저 귀사 **[제품/브랜드의 핵심 특징이나 스펙]**을 선택해 주시거나 아래 입력창을 통해 직접 설명해 주세요.`,
          timestamp: new Date(),
        },
      ]);
      setActiveTab("chat");
    }
  };

  if (isLanding) {
    return (
      <div className="min-h-screen bg-[#F1F6F0] text-[#1E3021] font-sans flex flex-col overflow-y-auto selection:bg-[#3E7D52] selection:text-white">
        {/* Navigation bar (Floating Rounded Capsule style matching the image header) */}
        <header className="max-w-7xl mx-auto w-full px-6 pt-5 sticky top-0 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-full shadow-[0_4px_25px_rgba(45,80,50,0.06)] border border-[#D5E2D5] px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E5EFE4] flex items-center justify-center text-[#3E7D52] font-black text-sm shadow-sm">
                DIR
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-[#1C3524] block">Strategy Director AI</span>
                <span className="text-[9px] text-[#556F5C] font-bold uppercase tracking-widest block -mt-1">Brand Campaign Blueprint</span>
              </div>
            </div>

            {/* Navigation options reflecting the requested menu labels */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-bold text-[#455D4C]">
              <a href="#features" className="hover:text-[#3E7D52] transition-colors">서비스 소개</a>
              <a href="#capabilities" className="hover:text-[#3E7D52] transition-colors">핵심 강점</a>
              <a href="#preview" className="hover:text-[#3E7D52] transition-colors">기획서 예시</a>
              <a href="#api-settings" className="hover:text-[#3E7D52] transition-colors font-extrabold text-[#3E7D52] flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                API 설정
              </a>
            </div>
            
            <div className="flex items-center gap-4">
              {userApiKey ? (
                <span className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  개인 API Key 활성됨
                </span>
              ) : (
                <span className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-zinc-600 bg-[#FAFDF9] border border-zinc-200 rounded-full shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  서버 기본 Key 사용
                </span>
              )}
              <button
                onClick={handleStartClick}
                className="bg-[#3E7D52] hover:bg-[#2D5C3B] text-white text-xs font-bold px-6 py-2.5 rounded-full transition-all duration-200 cursor-pointer shadow-[0_3px_12px_rgba(62,125,82,0.2)] flex items-center gap-1.5 hover:scale-102 active:scale-98"
              >
                기획 시작하기
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto w-full px-6 pt-6 pb-16">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-[#1C3524] via-[#2A5237] to-[#407450] text-white py-20 px-8 md:px-16 shadow-2xl">
            {/* Beautiful sunlit gradient glow representing the sunrise sun in the image */}
            <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-gradient-to-b from-[#FCD34D]/25 to-transparent rounded-full blur-[120px] pointer-events-none -translate-y-1/3 translate-x-1/4" />
            <div className="absolute -bottom-10 -left-10 w-[350px] h-[350px] bg-[#E5EFE4]/5 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="max-w-3xl relative z-10 space-y-6">
              {/* Top Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#162C1E]/60 border border-[#3E6F4B] text-xs text-[#D5EAD9] font-bold shadow-sm backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#FCD34D] animate-pulse" />
                <span>10년 차 마케팅 디렉터의 전략 지능 그대로</span>
              </div>

              {/* Display Headline */}
              <h1 className="text-3xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-white leading-[1.15]">
                간단한 제품 설명만으로 완성하는<br />
                <span className="text-[#FCD34D]">3-포지셔닝 마케팅 기획서</span>
              </h1>

              {/* Supporting Paragraph */}
              <p className="text-sm md:text-base text-[#D0E5D5] font-medium max-w-2xl leading-relaxed">
                아이디어 회의로 밤을 지새우지 마세요. 브랜드 디렉터 AI가 감성 소구, 기능 소구, 트렌드 소구의 3가지 컨셉 실행 시나리오와 맞춤 예산 채널 믹스를 실시간으로 자동 설계해 드립니다.
              </p>

              {/* Call to Action Controls */}
              <div className="pt-4">
                <button
                  onClick={handleStartClick}
                  className="bg-[#EFF5EE] hover:bg-white text-[#1C3524] text-xs md:text-sm font-extrabold px-8 py-4 rounded-full transition-all duration-200 shadow-xl flex items-center gap-2 hover:scale-[1.03] cursor-pointer active:scale-95 group"
                >
                  무료로 기획안 초안 받기
                  <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1 text-[#3E7D52]" />
                </button>
              </div>
            </div>

            {/* Micro stats at bottom of hero */}
            <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-3 gap-6 max-w-md relative z-10">
              <div>
                <span className="block text-2xl font-black text-[#FCD34D]">95%</span>
                <span className="text-[10px] text-[#C4DDD0] font-bold uppercase tracking-wider">기획 리소스 단축</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-white">3 Concepts</span>
                <span className="text-[10px] text-[#C4DDD0] font-bold uppercase tracking-wider">입체적 포지셔닝</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-white">100%</span>
                <span className="text-[10px] text-[#C4DDD0] font-bold uppercase tracking-wider">구체적 매체 설계</span>
              </div>
            </div>
          </div>

          {/* Search parameter bar overlapping bottom of hero (exactly like search bar layout in the image) */}
          <div className="relative -mt-10 mx-auto max-w-4xl bg-[#E2ECE2] p-3 rounded-full shadow-xl border border-[#CDE1CD] flex flex-col md:flex-row items-center justify-between gap-3 z-20">
            <div className="flex flex-1 w-full gap-2.5 flex-col sm:flex-row">
              <div className="bg-white px-6 py-3 rounded-full text-[11px] text-[#1E3021] font-bold flex-1 text-center border border-[#D5E3D5] shadow-sm flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#3E7D52]" />
                <span>제품 스펙/설명 분석</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-full text-[11px] text-[#1E3021] font-bold flex-1 text-center border border-[#D5E3D5] shadow-sm flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#FCD34D]" />
                <span>정밀 타겟 오디언스 지정</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-full text-[11px] text-[#1E3021] font-bold flex-1 text-center border border-[#D5E3D5] shadow-sm flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#407450]" />
                <span>실무 마케팅 예산 확정</span>
              </div>
            </div>
            <button
              onClick={handleStartClick}
              className="w-full md:w-auto bg-[#3E7D52] hover:bg-[#2D5C3B] text-white text-xs font-bold px-8 py-3.5 rounded-full flex items-center justify-center gap-1.5 shadow-md shrink-0 cursor-pointer transition-colors active:scale-98"
            >
              기획안 생성하기 (Build)
              <Zap className="h-3.5 w-3.5 text-[#FCD34D] fill-[#FCD34D]" />
            </button>
          </div>
        </section>

        {/* Section 2: Interactive Highlight Section */}
        <section id="preview" className="py-20 bg-white border-t border-[#E2ECE2]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Side: Mockup of Strategy Blueprint document (similar to the wooden house photo layout in the image) */}
              <div className="lg:col-span-6 relative">
                {/* Decorative circular element representing the green leaf round badge */}
                <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-[#3E7D52] flex items-center justify-center text-white shadow-lg border-4 border-white z-20">
                  <Award className="h-6 w-6" />
                </div>

                {/* Core Document mockup container with warm wood accents representing the image house timber */}
                <div className="bg-[#FAFDF9] border border-[#D8E6D8] rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  {/* Header Bar representing the wood panel look */}
                  <div className="h-3.5 bg-gradient-to-r from-[#8B5A2B] to-[#A0522D] rounded-t-xl absolute top-0 left-0 right-0" />
                  
                  {/* Simulated Header */}
                  <div className="flex items-center justify-between border-b border-[#E2ECE2] pb-4 mb-5 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#E5EFE4] flex items-center justify-center text-[#3E7D52] text-[10px] font-bold">D1</div>
                      <span className="text-[11px] font-mono font-bold text-[#3E5C44]">CONFIDENTIAL BRIEFING</span>
                    </div>
                    <span className="text-[9px] font-mono text-[#3E7D52] bg-[#EBF5EC] px-2 py-0.5 rounded border border-[#C1DFCD] font-bold">APPROVED REV 1.5</span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#3E7D52] font-bold">Slogan & Campaign Theme</span>
                      <p className="text-base font-extrabold text-[#1C3524] leading-snug">"기능을 넘어, 삶의 감각을 다시 깨우다"</p>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-white border border-[#E5EFE5] space-y-1">
                      <span className="text-[9px] font-mono text-[#556F5C] uppercase tracking-wider font-bold">핵심 카피라이트 슬로건</span>
                      <p className="text-[#1C3524] font-bold text-xs">"당신의 온전한 휴식을 서명합니다, 시그니처 웰니스"</p>
                    </div>

                    {/* Simulated Roadmap */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-[#556F5C] uppercase tracking-wider font-semibold block">릴리즈 로드맵</span>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div className="bg-[#F4F9F4] border border-[#E2ECE2] p-2.5 rounded-lg">
                          <span className="block font-bold text-[#3E7D52]">공감 스토리</span>
                          <span className="text-zinc-500 block text-[9px] mt-0.5">인스타 티징 만화</span>
                        </div>
                        <div className="bg-[#F4F9F4] border border-[#E2ECE2] p-2.5 rounded-lg">
                          <span className="block font-bold text-[#3E7D52]">체험/신뢰</span>
                          <span className="text-zinc-500 block text-[9px] mt-0.5">크루 100인 체험단</span>
                        </div>
                        <div className="bg-[#F4F9F4] border border-[#E2ECE2] p-2.5 rounded-lg">
                          <span className="block font-bold text-[#3E7D52]">확산/참여</span>
                          <span className="text-zinc-500 block text-[9px] mt-0.5">엠비언트 챌린지</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating secondary badge matching bottom graphic */}
                <div className="absolute -bottom-4 right-6 bg-white border border-[#D5E2D5] px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-[#2C4A35] font-bold">실시간 분석 엔진 가동 중</span>
                </div>
              </div>

              {/* Right Side: Text & Brand Value Prop */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF5EC] border border-[#C1DFCD] text-xs font-bold text-[#3E7D52]">
                  <Award className="h-3.5 w-3.5" />
                  <span>Interactive Live Workspace</span>
                </div>
                
                <h2 className="text-2xl md:text-3.5xl font-extrabold text-[#1C3524] tracking-tight leading-tight">
                  피드백 대화를 통해<br />
                  실시간으로 다듬어지는 기획서
                </h2>
                
                <p className="text-[#4A5E4E] text-sm font-medium leading-relaxed">
                  마음에 안 드는 슬로건이나 미흡한 오프라인 채널 믹스가 있으신가요? 디렉터와의 양방향 대화창에 피드백을 전달만 하면 인공지능 디렉터가 기획서를 완벽하게 세부 개정하여 실시간으로 우측 대시보드에 문서를 빌드합니다.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#E5EFE4] flex items-center justify-center text-[#3E7D52] text-xs flex-shrink-0 mt-0.5 font-bold">✓</div>
                    <div>
                      <span className="block text-sm font-bold text-[#1C3524]">무제한 피드백 루프 지원</span>
                      <span className="text-xs text-[#556F5C] font-semibold">1안 슬로건 변경, 3안 매체 비중 수정 등 맞춤 피드백 완벽 수용</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#E5EFE4] flex items-center justify-center text-[#3E7D52] text-xs flex-shrink-0 mt-0.5 font-bold">✓</div>
                    <div>
                      <span className="block text-sm font-bold text-[#1C3524]">TXT 다운로드 및 즉시 복사</span>
                      <span className="text-xs text-[#556F5C] font-semibold">완성된 마케팅 기획서를 원클릭으로 클립보드 복사 혹은 다운로드 가능</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setIsLanding(false)}
                    className="bg-[#3E7D52] hover:bg-[#2D5C3B] text-white text-xs font-bold px-6 py-3 rounded-full shadow-[0_4px_15px_rgba(62,125,82,0.15)] flex items-center gap-2 cursor-pointer active:scale-95 transition-all duration-150"
                  >
                    1분 만에 내 캠페인 만들기
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Section: Gemini API Key Configuration Panel */}
        <section id="api-settings" className="py-20 bg-white border-t border-[#E2ECE2]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-[#FAFDF9] border-2 border-[#CDE1CD] rounded-[2rem] p-8 md:p-12 shadow-xl relative overflow-hidden">
              {/* Gold/Sunlit sun flare accent top right to match the brand imagery */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-b from-[#FCD34D]/10 to-transparent rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center relative z-10">
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF5EC] border border-[#C1DFCD] text-xs font-bold text-[#3E7D52]">
                    <Shield className="h-3.5 w-3.5" />
                    <span>개인 API Key 보안 승인</span>
                  </div>
                  
                  <h2 className="text-2xl md:text-3.5xl font-extrabold text-[#1C3524] tracking-tight leading-tight">
                    나만의 Gemini API Key로<br />
                    초고속 마케팅 기획서 빌드하기
                  </h2>
                  
                  <p className="text-[#4A5E4E] text-xs md:text-sm font-medium leading-relaxed">
                    본 캠페인 제네레이터는 정밀한 3-포지셔닝 축 분석과 시퀀셜 카피 확장을 실시간 처리합니다. 
                    사용자가 보유한 개인 **Gemini API Key**를 아래에 안전하게 승인/등록하시면, API 한계나 대기열 정체 없이 무제한으로 쾌적한 10년 차 디렉터 지능을 소유하실 수 있습니다.
                  </p>

                  <div className="flex flex-col gap-2 pt-2 text-[#2C4A35] font-bold text-[11px]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#3E7D52] flex-shrink-0" />
                      <span>안전한 브라우저 내 로컬 보안 저장 (localStorage)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#3E7D52] flex-shrink-0" />
                      <span>API Key는 브라우저 외부로 직접 무단 노출되지 않음</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="bg-white p-6 rounded-2xl border border-[#D5E2D5] shadow-md space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-[#1C3524] flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-[#FCD34D] fill-[#FCD34D]" />
                          Gemini API Key 입력
                        </label>
                        <a 
                          href="https://aistudio.google.com/api-keys" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-[#3E7D52] font-black hover:underline"
                        >
                          무료 API Key 발급받기 →
                        </a>
                      </div>
                      
                      <div className="relative rounded-lg shadow-sm">
                        <input
                          type={showKey ? "text" : "password"}
                          value={apiKeyValue}
                          onChange={(e) => setApiKeyValue(e.target.value)}
                          placeholder="AIzaSy... 로 시작하는 Gemini API Key를 입력하세요"
                          className="w-full text-xs font-mono border border-[#CDE1CD] rounded-xl px-4 py-3.5 pr-20 focus:outline-none focus:ring-2 focus:ring-[#3E7D52] focus:border-transparent text-[#1C3524] placeholder-zinc-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#556F5C] font-bold hover:text-[#3E7D52] transition-colors cursor-pointer"
                        >
                          {showKey ? "숨기기" : "보기"}
                        </button>
                      </div>
                    </div>

                    {/* Feedback Messages */}
                    {verifyStatus !== "idle" && (
                      <div className={`p-4 rounded-xl text-xs font-semibold leading-relaxed border ${
                        verifyStatus === "success" 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                          : "bg-red-50 border-red-200 text-red-800"
                      }`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0 mt-0.5 text-[9px] ${
                            verifyStatus === "success" ? "bg-emerald-600" : "bg-red-600"
                          }`}>
                            {verifyStatus === "success" ? "✓" : "!"}
                          </div>
                          <span>{verifyMessage}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => verifyAndSaveApiKey(apiKeyValue)}
                        disabled={isVerifying}
                        className="flex-1 bg-[#3E7D52] hover:bg-[#2D5C3B] disabled:bg-[#A3CBB0] text-white text-xs font-extrabold py-3.5 px-4 rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                      >
                        {isVerifying ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            키 상태 확인 중...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            API Key 검증 및 승인 저장
                          </>
                        )}
                      </button>

                      {userApiKey && (
                        <button
                          type="button"
                          onClick={() => {
                            useDefaultServerKey();
                            setApiKeyValue("");
                          }}
                          className="bg-[#EFF5EE] hover:bg-[#E2ECE2] text-[#3E7D52] text-xs font-extrabold py-3.5 px-4 rounded-xl border border-[#CDE1CD] transition-colors cursor-pointer"
                        >
                          서버 기본 키로 환원
                        </button>
                      )}
                    </div>

                    <div className="text-[10px] text-[#556F5C] font-semibold flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${userApiKey ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                      현재 상태: {userApiKey ? (
                        <span className="text-emerald-700 font-extrabold">개인 API Key 승인 활성화 중 (보안 터널 사용)</span>
                      ) : (
                        <span className="text-[#556F5C]">서버 기본 공유 API Key 사용 중</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Core Capabilities (Precisely matching the bottom cards layout in the image) */}
        <section id="capabilities" className="py-20 bg-[#F2F6F1] border-t border-[#E2ECE2]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-[0.2em] text-[#3E7D52] font-black mb-3">Core Capabilities</h2>
              <p className="text-2xl md:text-3.5xl font-extrabold text-[#1C3524] tracking-tight leading-snug">
                일반 대형 언어 모델의 밋밋한 답변과는 차원이 다른<br />
                실무 지향형 마케팅 프레임워크의 강점
              </p>
            </div>

            {/* 3 Column Cards Layout (Precisely matching the bottom cards in the image) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white rounded-[2rem] overflow-hidden border border-[#D5E2D5] shadow-lg flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div>
                  {/* Header Visual - Green nature graphic matching image cards */}
                  <div className="rounded-2xl h-44 bg-gradient-to-br from-[#E2EFE2] to-[#CDE1CD] relative overflow-hidden mb-6 flex items-center justify-center border border-[#CDE1CD]">
                    <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full opacity-80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0,80 C50,60 80,90 120,70 C160,50 180,85 200,75 L200,100 L0,100 Z" fill="#9CC59C" />
                      <path d="M0,90 C40,75 70,100 110,85 C150,70 170,95 200,85 L200,100 L0,100 Z" fill="#3E7D52" opacity="0.6" />
                      <circle cx="150" cy="40" r="15" fill="#FFE082" />
                    </svg>
                    <Compass className="h-8 w-8 text-[#3E7D52] relative z-10" />
                  </div>

                  <h3 className="text-lg font-bold text-[#1C3524] mb-2 px-1">01. 상호 배타적인 3개 포지셔닝</h3>
                  <p className="text-xs text-[#556F5C] leading-relaxed font-semibold mb-4 px-1">
                    컨셉들이 애매하게 중복되지 않습니다. 감성/공감 축, 이성/기능 스펙 축, 문화/트렌드 축의 확실한 독립적인 3가지 슬로건과 톤앤매너를 도출하여 의사결정 범위를 입체적으로 넓힙니다.
                  </p>
                </div>
                
                <button
                  onClick={handleStartClick}
                  className="bg-[#3E7D52] hover:bg-[#2D5C3B] text-white text-xs font-bold py-3 px-4 rounded-full w-full text-center block mt-4 shadow-sm cursor-pointer transition-colors"
                >
                  자세히 알아보기
                </button>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-[2rem] overflow-hidden border border-[#D5E2D5] shadow-lg flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div>
                  {/* Header Visual - Green nature graphic matching image cards */}
                  <div className="rounded-2xl h-44 bg-gradient-to-br from-[#E2EFE2] to-[#CDE1CD] relative overflow-hidden mb-6 flex items-center justify-center border border-[#CDE1CD]">
                    <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full opacity-80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0,85 C60,65 90,85 130,70 C170,55 180,75 200,65 L200,100 L0,100 Z" fill="#9CC59C" />
                      <path d="M0,95 C50,85 80,100 120,90 C160,80 180,95 200,90 L200,100 L0,100 Z" fill="#3E7D52" opacity="0.6" />
                      <rect x="85" y="45" width="30" height="30" rx="2" fill="#E2ECE2" stroke="#3E7D52" strokeWidth="2" />
                      <path d="M80,45 L100,30 L120,45 Z" fill="#8B5A2B" />
                    </svg>
                    <Flame className="h-8 w-8 text-[#3E7D52] relative z-10" />
                  </div>

                  <h3 className="text-lg font-bold text-[#1C3524] mb-2 px-1">02. 3개 버전 실무 가용 시나리오</h3>
                  <p className="text-xs text-[#556F5C] leading-relaxed font-semibold mb-4 px-1">
                    이론적인 뜬구름 소리는 그만. 타겟 오디언스가 즉각 반응할 수 있도록 공감 스토리형(A), 핵심 기술 기능형(B), 인플루언서 연계 인터랙션형(C)으로 실무 명칭 및 액션을 동시에 릴리즈합니다.
                  </p>
                </div>
                
                <button
                  onClick={handleStartClick}
                  className="bg-[#3E7D52] hover:bg-[#2D5C3B] text-white text-xs font-bold py-3 px-4 rounded-full w-full text-center block mt-4 shadow-sm cursor-pointer transition-colors"
                >
                  전략 수립 규칙 확인
                </button>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-[2rem] overflow-hidden border border-[#D5E2D5] shadow-lg flex flex-col justify-between p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div>
                  {/* Header Visual - Green nature graphic matching image cards */}
                  <div className="rounded-2xl h-44 bg-gradient-to-br from-[#E2EFE2] to-[#CDE1CD] relative overflow-hidden mb-6 flex items-center justify-center border border-[#CDE1CD]">
                    <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full opacity-80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0,75 C40,55 70,85 110,65 C150,45 170,75 200,60 L200,100 L0,100 Z" fill="#9CC59C" />
                      <path d="M0,85 C30,75 60,95 100,80 C140,65 160,85 200,75 L200,100 L0,100 Z" fill="#3E7D52" opacity="0.6" />
                      <circle cx="50" cy="35" r="10" fill="#FFE082" />
                    </svg>
                    <Coins className="h-8 w-8 text-[#3E7D52] relative z-10" />
                  </div>

                  <h3 className="text-lg font-bold text-[#1C3524] mb-2 px-1">03. 정밀 예산 기반 채널 믹스</h3>
                  <p className="text-xs text-[#556F5C] leading-relaxed font-semibold mb-4 px-1">
                    '홍보를 잘 합니다' 같은 무의미한 조언을 배제합니다. 마이크로 인플루언서 피드 배치 비율, 퍼포먼스 광고 단가 예시 등 입력하신 실제 예산 한계를 칼같이 파악하여 매체별 배분을 시각화합니다.
                  </p>
                </div>
                
                <button
                  onClick={handleStartClick}
                  className="bg-[#3E7D52] hover:bg-[#2D5C3B] text-white text-xs font-bold py-3 px-4 rounded-full w-full text-center block mt-4 shadow-sm cursor-pointer transition-colors"
                >
                  채널 비율 미리보기
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Professional Footer */}
        <footer className="border-t border-[#D5E2D5] bg-[#E5ECE5] py-12 text-center text-[#556F5C] text-xs">
          <div className="max-w-7xl mx-auto px-6 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#3E7D52]/10 flex items-center justify-center text-[#3E7D52] font-black text-[10px]">DIR</div>
              <span className="font-extrabold text-[#1C3524] text-sm">Strategy Director AI</span>
            </div>
            <p className="font-bold max-w-md mx-auto leading-relaxed text-[#455D4C]">
              본 서비스는 실무자가 바로 가용할 수 있는 고밀도의 상호 배타적인 3개 컨셉 기획을 제안하는 1등 브랜드 캠페인 제네레이터입니다.
            </p>
            <div className="pt-4 text-[10px] font-mono text-[#556F5C]/80">
              © 2026 STRATEGIC DIRECTOR AI. ALL RIGHTS RESERVED.
            </div>
          </div>
        </footer>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-[#F1F6F0] text-[#1E3021] font-sans flex flex-col overflow-hidden h-screen">
      
      {/* Container: Sidebar + Main Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR (Strategy Blueprint) - Hidden on Mobile */}
        <aside className="w-80 border-r border-[#D5E2D5] bg-white flex flex-col hidden lg:flex flex-shrink-0 shadow-sm">
          <div className="p-8 border-b border-[#E5EFE4]">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#3E7D52] mb-2.5 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3E7D52] shadow-[0_0_8px_rgba(62,125,82,0.4)] animate-pulse"></span>
              DIRECTOR PROTOCOL ACTIVE
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#1C3524]">Strategy Director AI</h1>
            <p className="text-xs text-[#556F5C] mt-1.5 leading-relaxed font-semibold">김도현의 3-포지셔닝 기획 솔루션 v1.5</p>
          </div>
          
          <nav className="flex-1 px-5 py-8 overflow-y-auto space-y-8">
            <div className="space-y-5">
              <div className="text-[11px] uppercase tracking-wider text-[#556F5C] font-bold">진행 프로세스 (PHASES)</div>
              
              {/* Step 1 Indicator */}
              <div className={`flex items-center gap-4 transition-all duration-300 ${step === 1 ? 'opacity-100 scale-102' : step > 1 ? 'opacity-80' : 'opacity-40'}`}>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${
                  step === 1 
                    ? 'border-[#3E7D52] text-[#3E7D52] bg-[#E5EFE4] shadow-sm' 
                    : step > 1 
                      ? 'border-[#2D5C3B] text-white bg-[#3E7D52]' 
                      : 'border-[#D5E2D5] text-[#8EA294]'
                }`}>
                  {step > 1 ? "✓" : "01"}
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${step === 1 ? 'text-[#3E7D52]' : 'text-[#8EA294]'}`}>Phase 01</span>
                  <span className="text-[13px] text-[#1C3524] font-bold">브랜드 및 제품 특징 분석</span>
                </div>
              </div>

              {/* Step 2 Indicator */}
              <div className={`flex items-center gap-4 transition-all duration-300 ${step === 2 ? 'opacity-100 scale-102' : step > 2 ? 'opacity-80' : 'opacity-40'}`}>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${
                  step === 2 
                    ? 'border-[#3E7D52] text-[#3E7D52] bg-[#E5EFE4] shadow-sm' 
                    : step > 2 
                      ? 'border-[#2D5C3B] text-white bg-[#3E7D52]' 
                      : 'border-[#D5E2D5] text-[#8EA294]'
                }`}>
                  {step > 2 ? "✓" : "02"}
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${step === 2 ? 'text-[#3E7D52]' : 'text-[#8EA294]'}`}>Phase 02</span>
                  <span className="text-[13px] text-[#1C3524] font-bold">정밀 타겟 오디언스 설정</span>
                </div>
              </div>

              {/* Step 3 Indicator */}
              <div className={`flex items-center gap-4 transition-all duration-300 ${step === 3 ? 'opacity-100 scale-102' : step > 3 ? 'opacity-80' : 'opacity-40'}`}>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${
                  step === 3 
                    ? 'border-[#3E7D52] text-[#3E7D52] bg-[#E5EFE4] shadow-sm' 
                    : step > 3 
                      ? 'border-[#2D5C3B] text-white bg-[#3E7D52]' 
                      : 'border-[#D5E2D5] text-[#8EA294]'
                }`}>
                  {step > 3 ? "✓" : "03"}
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${step === 3 ? 'text-[#3E7D52]' : 'text-[#8EA294]'}`}>Phase 03</span>
                  <span className="text-[13px] text-[#1C3524] font-bold">가용 마케팅 예산 확정</span>
                </div>
              </div>

              {/* Step 4 Indicator */}
              <div className={`flex items-center gap-4 transition-all duration-300 ${step === 4 ? 'opacity-100 scale-102' : 'opacity-40'}`}>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${
                  step === 4 
                    ? 'border-[#3E7D52] text-white bg-[#3E7D52] shadow-sm border-dashed' 
                    : 'border-[#D5E2D5] text-[#8EA294]'
                }`}>
                  04
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${step === 4 ? 'text-[#3E7D52]' : 'text-[#8EA294]'}`}>Phase 04</span>
                  <span className="text-[13px] text-[#1C3524] font-bold">최종 캠페인 기획서 도출</span>
                </div>
              </div>

            </div>

            <div className="pt-6 border-t border-[#E5EFE4]">
              <div className="text-[11px] uppercase tracking-wider text-[#556F5C] mb-3.5 font-bold">Marketing Blueprint Rule</div>
              <ul className="space-y-3.5 text-xs text-[#455D4C] font-semibold">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-[#3E7D52] rounded-full mt-1.5 flex-shrink-0"></span>
                  <span><strong>3-컨셉 차별화 분리</strong>: 감성/기능/트렌드 축의 중복 배제</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-[#3E7D52] rounded-full mt-1.5 flex-shrink-0"></span>
                  <span><strong>3-버전 소구 릴리즈</strong>: 공감형(A) 기능형(B) 체험형(C)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-[#3E7D52] rounded-full mt-1.5 flex-shrink-0"></span>
                  <span><strong>예산 맞춤 채널 믹스</strong>: 한계 상황을 고려한 효율 배분</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-[#3E7D52] rounded-full mt-1.5 flex-shrink-0"></span>
                  <span><strong>전문적 실무 용어</strong>: 애매모호한 추상적 어휘 배제</span>
                </li>
              </ul>
            </div>
          </nav>

          <div className="p-6 bg-[#FAFDF9] border-t border-[#D5E2D5]">
            <div className="text-[10px] text-[#556F5C]/80 tracking-wider font-mono font-bold">© 2026 STRATEGIC DIRECTOR AI</div>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F1F6F0]">
          
          {/* Header */}
          <header className="h-20 border-b border-[#D5E2D5] flex items-center justify-between px-6 md:px-10 bg-white/90 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3E7D52] shadow-[0_0_10px_rgba(62,125,82,0.4)] animate-pulse"></div>
              <span className="text-[13px] tracking-wider text-[#455D4C] font-extrabold font-mono uppercase">
                {isTyping ? "DIRECTOR IS PROCESSING ARGUMENTS..." : "SENIOR BRAND DIRECTOR INTERACTIVE"}
              </span>
            </div>
            
            <div className="flex gap-4">
              {step > 1 && (
                <button 
                  onClick={resetFlow}
                  className="text-xs tracking-wide text-[#455D4C] hover:text-[#1C3524] transition-all border border-[#D5E2D5] rounded-full px-5 py-2.5 bg-white hover:bg-[#E5EFE4] hover:border-[#3E7D52]/40 shadow-sm active:scale-95 cursor-pointer font-bold"
                >
                  기획 초기화 (Reset Session)
                </button>
              )}
            </div>
          </header>

          {/* Grid area */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 p-4 md:p-6 gap-6">
            
            {/* Mobile View Tab Switcher */}
            <div className="lg:hidden col-span-1 flex space-x-1.5 p-1 bg-white rounded-full border border-[#D5E2D5] mb-2 shadow-sm">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-full flex items-center justify-center gap-2 transition-all ${
                  activeTab === "chat" ? "bg-[#3E7D52] text-white shadow-md" : "text-[#556F5C] hover:text-[#1C3524]"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                디렉터 대화방
                {step < 4 && (
                  <span className="h-2 w-2 rounded-full bg-[#3E7D52] animate-ping"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("proposal")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-full flex items-center justify-center gap-2 transition-all ${
                  activeTab === "proposal" ? "bg-[#3E7D52] text-white shadow-md" : "text-[#556F5C] hover:text-[#1C3524]"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                캠페인 기획서
                {proposal && (
                  <span className="px-2 py-0.5 text-[9px] bg-[#3E7D52] text-white font-extrabold rounded-full">
                    완성
                  </span>
                )}
              </button>
            </div>

            {/* LEFT PANEL: Chat Window */}
            <section
              className={`lg:col-span-6 flex flex-col bg-white rounded-3xl border border-[#D5E2D5] shadow-[0_4px_25px_rgba(45,80,50,0.06)] overflow-hidden ${
                activeTab === "chat" ? "flex" : "hidden lg:flex"
              }`}
              id="chat-panel"
            >
              {/* Director Card Title */}
              <div className="px-6 py-4.5 border-b border-[#E5EFE4] bg-[#FAFDF9] flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-[#E5EFE4] flex items-center justify-center text-[#3E7D52] font-black text-sm tracking-tighter">
                      DIR
                    </div>
                    <div className="absolute bottom-[-1px] right-[-1px] h-3 w-3 rounded-full bg-[#3E7D52] border border-white"></div>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#1C3524] tracking-wide">
                      김도현 마케팅 디렉터
                    </h3>
                    <p className="text-[11px] text-[#556F5C] font-semibold">Creative & Performance Director</p>
                  </div>
                </div>
                <div className="text-[11px] font-bold text-[#3E7D52] bg-[#E5EFE4] px-3.5 py-1 rounded-full border border-[#CDE1CD]">
                  Step {step} of 4
                </div>
              </div>

              {/* Chat Message Box */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F7FAF6]/40">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                        msg.sender === "user"
                          ? "bg-[#3E7D52] text-white rounded-tr-none font-bold"
                          : "bg-white text-[#1E3021] border border-[#D5E2D5] rounded-tl-none whitespace-pre-line"
                      }`}
                    >
                      {msg.text}
                      <span className={`block text-[10px] mt-2 font-mono text-right ${msg.sender === "user" ? 'text-white/80' : 'text-[#8EA294]'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-[#D5E2D5] rounded-2xl rounded-tl-none px-5 py-4 shadow-sm max-w-[85%]">
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-[#3E7D52] animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 rounded-full bg-[#3E7D52] animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 rounded-full bg-[#3E7D52] animate-bounce"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Options / Form Controls */}
              <div className="p-5 border-t border-[#E5EFE4] bg-[#FAFDF9] space-y-5">
                
                {/* Dynamically Populated Selection Options */}
                {!isTyping && step < 4 && !showCustomInput && (
                  <div className="space-y-3">
                    <p className="text-xs text-[#556F5C] uppercase tracking-wider font-bold px-1 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[#3E7D52] animate-pulse" />
                      디렉터가 추천하는 마케팅 설계 옵션 (클릭)
                    </p>
                    
                    <div className="flex flex-col gap-2.5 max-h-[180px] overflow-y-auto pr-1">
                      {step === 1 &&
                        STEP1_DEFAULT_EXAMPLES.map((ex, i) => (
                          <button
                            key={`step1-${i}`}
                            onClick={() => handleSelectOption(ex)}
                            className="text-left text-sm bg-white hover:bg-[#E5EFE4]/60 active:bg-[#E5EFE4] text-[#1E3021] px-4 py-3.5 rounded-xl border border-[#D5E2D5] hover:border-[#3E7D52]/50 transition-all duration-200 group active:scale-[0.99] cursor-pointer shadow-sm"
                          >
                            <span className="block text-[10px] text-[#3E7D52] uppercase tracking-wider mb-1 font-bold">추천 옵션 0{i + 1}</span>
                            <span className="font-bold text-[#1C3524]">{ex}</span>
                          </button>
                        ))}

                      {step === 2 && (
                        <>
                          {isLoadingSuggestions ? (
                            <div className="text-sm text-[#556F5C] py-4 flex items-center justify-center gap-2.5 font-bold bg-white rounded-xl border border-[#D5E2D5] shadow-sm">
                              <RefreshCw className="h-4 w-4 animate-spin text-[#3E7D52]" />
                              정밀 오디언스 페르소나 분석 중...
                            </div>
                          ) : (
                            dynamicSuggestions.map((ex, i) => (
                              <button
                                key={`step2-${i}`}
                                onClick={() => handleSelectOption(ex)}
                                className="text-left text-sm bg-white hover:bg-[#E5EFE4]/60 active:bg-[#E5EFE4] text-[#1E3021] px-4 py-3.5 rounded-xl border border-[#D5E2D5] hover:border-[#3E7D52]/50 transition-all duration-200 group active:scale-[0.99] cursor-pointer shadow-sm"
                              >
                                <span className="block text-[10px] text-[#3E7D52] uppercase tracking-wider mb-1 font-bold">추천 옵션 0{i + 1}</span>
                                <span className="font-bold text-[#1C3524]">{ex}</span>
                              </button>
                            ))
                          )}
                        </>
                      )}

                      {step === 3 && (
                        <>
                          {isLoadingSuggestions ? (
                            <div className="text-sm text-[#556F5C] py-4 flex items-center justify-center gap-2.5 font-bold bg-white rounded-xl border border-[#D5E2D5] shadow-sm">
                              <RefreshCw className="h-4 w-4 animate-spin text-[#3E7D52]" />
                              최적 마케팅 채널 믹스 시나리오 계산 중...
                            </div>
                          ) : (
                            dynamicSuggestions.map((ex, i) => (
                              <button
                                key={`step3-${i}`}
                                onClick={() => handleSelectOption(ex)}
                                className="text-left text-sm bg-white hover:bg-[#E5EFE4]/60 active:bg-[#E5EFE4] text-[#1E3021] px-4 py-3.5 rounded-xl border border-[#D5E2D5] hover:border-[#3E7D52]/50 transition-all duration-200 group active:scale-[0.99] cursor-pointer shadow-sm"
                              >
                                <span className="block text-[10px] text-[#3E7D52] uppercase tracking-wider mb-1 font-bold">추천 옵션 0{i + 1}</span>
                                <span className="font-bold text-[#1C3524]">{ex}</span>
                              </button>
                            ))
                          )}
                        </>
                      )}

                      <button
                        onClick={() => handleSelectOption("custom")}
                        className="text-center text-xs bg-[#E5EFE4] hover:bg-[#D5E2D5] text-[#3E7D52] py-3.5 rounded-xl border border-[#CDE1CD] transition-all tracking-wider uppercase font-bold cursor-pointer"
                      >
                        ✏️ 제가 직접 상세하게 입력하겠습니다 (Custom Text Input)
                      </button>
                    </div>
                  </div>
                )}

                {/* Text input form */}
                {(showCustomInput || step === 4 || isClarifyingTarget) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (customInputValue.trim()) {
                        handleSendMessage(customInputValue);
                      }
                    }}
                    className="flex items-center space-x-2.5"
                  >
                    <input
                      type="text"
                      value={customInputValue}
                      onChange={(e) => setCustomInputValue(e.target.value)}
                      placeholder={
                        step === 4
                          ? "기획서 1안/2안/3안의 특정 세부 조정을 피드백해 주십시오 (예: 2안 슬로건 변경)"
                          : isClarifyingTarget
                            ? "타겟 오디언스의 구체적인 직군, 취향 혹은 나이대를 보완해 주세요"
                            : "의견이나 내용을 자유롭고 구체적으로 기술해 주십시오..."
                      }
                      className="flex-1 bg-white text-[#1E3021] rounded-xl px-4 py-3.5 text-sm border border-[#D5E2D5] focus:outline-none focus:border-[#3E7D52] placeholder-[#8EA294]/80 shadow-sm transition-all font-semibold"
                      disabled={isTyping}
                    />
                    <button
                      type="submit"
                      disabled={isTyping || !customInputValue.trim()}
                      className="bg-[#3E7D52] hover:bg-[#2D5C3B] disabled:bg-[#FAFDF9] disabled:text-[#8EA294] text-white p-3.5 rounded-xl transition-all font-bold cursor-pointer shadow-md"
                    >
                      <Send className="h-4.5 w-4.5" />
                    </button>
                  </form>
                )}

                {step === 4 && (
                  <p className="text-[11px] text-[#556F5C] text-center font-medium">
                    💡 <span className="text-[#3E7D52] font-bold">Feedback Loop:</span> 수정사항을 입력하시면 피드백을 수용하여 기획 내용을 세부 개정해 드립니다.
                  </p>
                )}
              </div>
            </section>

            {/* RIGHT PANEL: Live Campaign Proposal Dashboard */}
            <section
              className={`lg:col-span-6 flex flex-col bg-white rounded-3xl border border-[#D5E2D5] shadow-[0_4px_25px_rgba(45,80,50,0.06)] overflow-hidden ${
                activeTab === "proposal" ? "flex" : "hidden lg:flex"
              }`}
              id="proposal-panel"
            >
              {/* Header inside Panel */}
              <div className="px-6 py-4.5 border-b border-[#E5EFE4] bg-[#FAFDF9] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layout className="h-4.5 w-4.5 text-[#3E7D52]" />
                  <h2 className="font-extrabold text-xs tracking-wider text-[#1C3524] uppercase font-mono">
                    Campaign Live Feed
                  </h2>
                </div>

                {proposal && !isGeneratingProposal && (
                  <div className="flex space-x-2">
                    <button
                      onClick={copyToClipboard}
                      className="text-[11px] bg-white hover:bg-[#E5EFE4] text-[#1C3524] px-3.5 py-1.5 rounded-full border border-[#D5E2D5] flex items-center gap-1.5 transition-all font-bold cursor-pointer shadow-sm"
                    >
                      <Copy className="h-3.5 w-3.5 text-[#3E7D52]" />
                      {copied ? "COPIED" : "COPY"}
                    </button>
                    <button
                      onClick={downloadAsTxt}
                      className="text-[11px] bg-[#E5EFE4] hover:bg-[#3E7D52] hover:text-white text-[#3E7D52] px-3.5 py-1.5 rounded-full border border-[#CDE1CD] flex items-center gap-1.5 transition-all font-bold cursor-pointer shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      DOWNLOAD
                    </button>
                  </div>
                )}
              </div>

              {/* Panel Content Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F7FAF6]/40 relative">
                
                {/* STEP-BY-STEP PROGRESS MONITOR */}
                {step < 4 && (
                  <div className="mb-6 p-5 rounded-2xl bg-white border border-[#D5E2D5] space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#E5EFE4] pb-2.5">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#3E7D52] flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4" />
                        캠페인 수립 요건 실시간 트래커
                      </h4>
                      <span className="text-[10px] font-mono text-[#8EA294] font-bold">Live Analyzer Sync</span>
                    </div>
                    
                    <div className="space-y-4 text-sm">
                      {/* Param 1: Feature */}
                      <div className="flex items-start space-x-3.5">
                        <div className="mt-0.5">
                          {productFeatures ? (
                            <CheckCircle2 className="h-5 w-5 text-[#3E7D52] fill-[#3E7D52]/10" />
                          ) : (
                            <Circle className="h-5 w-5 text-[#CDE1CD] animate-pulse" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#556F5C]">01. 브랜드 및 핵심 특징</div>
                          {productFeatures ? (
                            <p className="text-[#1C3524] mt-1.5 font-bold text-[13.5px] bg-[#FAFDF9] p-3 rounded-xl border border-[#E5EFE4] shadow-sm">
                              "{productFeatures}"
                            </p>
                          ) : (
                            <p className="text-[#8EA294] mt-1 italic text-[13px] font-medium">분석 단계 입력 대기 중...</p>
                          )}
                        </div>
                      </div>

                      {/* Param 2: Target */}
                      <div className="flex items-start space-x-3.5">
                        <div className="mt-0.5">
                          {target ? (
                            <CheckCircle2 className="h-5 w-5 text-[#3E7D52] fill-[#3E7D52]/10" />
                          ) : (
                            <Circle className="h-5 w-5 text-[#CDE1CD]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#556F5C]">02. 공략 타겟 페르소나</div>
                          {target ? (
                            <p className="text-[#1C3524] mt-1.5 font-bold text-[13.5px] bg-[#FAFDF9] p-3 rounded-xl border border-[#E5EFE4] shadow-sm">
                              "{target}"
                            </p>
                          ) : (
                            <p className="text-[#8EA294] mt-1 italic text-[13px] font-medium">분석 단계 입력 대기 중...</p>
                          )}
                        </div>
                      </div>

                      {/* Param 3: Budget */}
                      <div className="flex items-start space-x-3.5">
                        <div className="mt-0.5">
                          {budget ? (
                            <CheckCircle2 className="h-5 w-5 text-[#3E7D52] fill-[#3E7D52]/10" />
                          ) : (
                            <Circle className="h-5 w-5 text-[#CDE1CD]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#556F5C]">03. 마케팅 예산 규모</div>
                          {budget ? (
                            <p className="text-[#1C3524] mt-1.5 font-bold text-[13.5px] bg-[#FAFDF9] p-3 rounded-xl border border-[#E5EFE4] shadow-sm">
                              "{budget}"
                            </p>
                          ) : (
                            <p className="text-[#8EA294] mt-1 italic text-[13px] font-medium">분석 단계 입력 대기 중...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* GENERATION SPINNER */}
                {isGeneratingProposal && (
                  <div className="absolute inset-0 bg-[#F1F6F0]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
                    <div className="relative mb-6">
                      <div className="h-16 w-16 rounded-full border-2 border-[#D5E2D5] border-t-[#3E7D52] animate-spin"></div>
                      <Sparkles className="h-6 w-6 text-[#3E7D52] absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <h3 className="text-lg font-extrabold text-[#1C3524] mb-2">
                      캠페인 기획안 초안 수립 중
                    </h3>
                    <p className="text-sm text-[#556F5C] max-w-sm mb-6 leading-relaxed font-semibold">
                      감성/공감, 기능/성능, 사회 트렌드 포지셔닝 별 기획 방향을 완벽 분리하고 예산 범위 내 최적화된 매체 믹스 계획을 정밀하게 설계하고 있습니다.
                    </p>
                    <div className="space-y-1.5 text-xs text-[#8EA294] font-mono font-bold">
                      <p>• 슬로건 20자 제한 엄격 검사 적용 중...</p>
                      <p>• 가치 없는 어휘 완전 배제 필터링 통과 중...</p>
                      <p>• 실무지향 정량 매체 집행 단가 계산 중...</p>
                    </div>
                  </div>
                )}

                {/* COMPLETED PROPOSAL PRESENTATION SHEET */}
                {proposal ? (
                  <div className="bg-white rounded-2xl p-6 md:p-10 text-[#1E3021] shadow-md border border-[#D5E2D5] relative">
                    
                    {/* Visual Stamp Decorator */}
                    <div className="border-b border-[#E5EFE4] pb-5 mb-8">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-[0.3em] font-mono text-[#3E7D52] font-black">
                          CONFIDENTIAL BRANDING BRIEF
                        </p>
                        <span className="text-[10px] font-mono text-white bg-[#3E7D52] px-2.5 py-0.5 rounded font-extrabold">
                          PROPOSAL ISSUED
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-[#556F5C]">
                          작성 책임자: <strong>김도현 Creative Director AI</strong>
                        </span>
                        <span className="text-[10px] bg-[#FAFDF9] border border-[#D5E2D5] px-2.5 py-0.5 font-mono text-[#455D4C] rounded font-bold">
                          REVISION 1.5
                        </span>
                      </div>
                    </div>

                    {/* Markdown Body container */}
                    <div className="markdown-body">
                      <ReactMarkdown>{proposal}</ReactMarkdown>
                    </div>

                    {/* Luxury Footer Stamp */}
                    <div className="border-t border-[#E5EFE4] pt-5 mt-10 flex justify-between items-center text-[10px] text-[#8EA294] font-mono font-bold">
                      <span>DOC ID: SPB-2026-MARKETING</span>
                      <span>STRICTLY CONFIDENTIAL</span>
                    </div>
                  </div>
                ) : (
                  /* INACTIVE/EMPTY FEEDSTATE */
                  !isGeneratingProposal && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 min-h-[350px]">
                      <div className="bg-white p-5 rounded-3xl border border-[#D5E2D5] text-[#3E7D52] mb-5 shadow-sm">
                        <MessageSquare className="h-10 w-10 text-[#3E7D52]" />
                      </div>
                      <h3 className="text-base font-extrabold text-[#1C3524] mb-2">
                        캠페인 기획서 수립 대기 중
                      </h3>
                      <p className="text-xs text-[#556F5C] max-w-xs leading-relaxed mb-8 font-semibold">
                        좌측 대화 창에서 김도현 브랜드 디렉터와의 문답 세션을 진행하시면, 완벽한 3개 컨셉 기획안과 구체적인 예산 실행 채널 계획서가 실시간 도출됩니다.
                      </p>

                      <div className="w-full max-w-sm text-left p-5 bg-[#FAFDF9] rounded-2xl border border-[#D5E2D5] space-y-3 text-xs text-[#455D4C] font-semibold shadow-sm">
                        <p className="font-extrabold text-[#3E7D52] tracking-wider uppercase text-[11px]">
                          ⚡ DIRECTOR'S CAMPAIGN PROTOCOLS
                        </p>
                        <p>• <strong>포지셔닝 축 다각화</strong>: 감성/공감 축, 기능/성능 축, 최신 트렌드 축 완전 분리 설계</p>
                        <p>• <strong>소구안 3버전 분할</strong>: 공감형(A) 기능형(B) 체험형(C) 개별 세부 기획</p>
                        <p>• <strong>예산 규모별 채널 믹스</strong>: 가용 예산 내 집행 가능한 핵심 구체 채널 선정</p>
                        <p>• <strong>정밀 수치 및 실무 어휘</strong>: '많이', '원활한' 등의 추상 어휘 차단 및 정량화</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

          </div>

          {/* Footer Navigation bar */}
          <footer className="h-16 border-t border-[#D5E2D5] bg-white/90 px-6 md:px-10 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-8 text-[11px] text-[#556F5C] uppercase tracking-widest font-mono font-bold">
              <div className="flex items-center gap-2">
                <span className="text-[#8EA294]">PHASE</span> {step === 4 ? <span className="text-[#3E7D52] font-black">COMPLETE</span> : `0${step}/03`}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#8EA294]">PROGRESS</span> {step === 1 ? "25%" : step === 2 ? "50%" : step === 3 ? "75%" : <span className="text-[#3E7D52] font-black">100%</span>}
              </div>
            </div>
            
            <div className="text-xs text-[#8EA294] font-bold hidden md:block">
              본 시스템은 실무 실용성을 극대화하기 위해 구체적인 제품 명칭과 예산 시나리오를 엄밀히 검증합니다.
            </div>
          </footer>

        </main>
      </div>

    </div>
  );
}
