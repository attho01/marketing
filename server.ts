import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API Client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper: Get AI client dynamically using user-provided API key or system API key
function getAiClient(req: any) {
  const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key가 누락되었습니다. 랜딩페이지 상단 혹은 설정 영역에서 API Key를 입력하여 활성화해 주세요.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper: safe JSON parsing
function parseJsonArray(text: string): string[] {
  try {
    // Look for JSON array block [...]
    const match = text.match(/\[\s*[\s\S]*?\s*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    // Direct attempt
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON parsing failed, fallback to line splitting", e, text);
    // Fallback parsing lines
    return text
      .split("\n")
      .map((line) => line.replace(/^[\s\d.\-*\"']+|[\"',]+$/g, "").trim())
      .filter((line) => line.length > 0 && !line.startsWith("[") && !line.startsWith("]"));
  }
}

// API: Verify if a custom Gemini API key is valid
app.post("/api/verify-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    const testKey = apiKey || process.env.GEMINI_API_KEY;
    if (!testKey) {
      return res.status(400).json({ error: "Gemini API Key가 존재하지 않습니다." });
    }
    const testAi = new GoogleGenAI({
      apiKey: testKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    // Call a lightweight model check
    await testAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Hello",
    });
    return res.json({ success: true, message: "Gemini API Key가 정상 승인되었습니다." });
  } catch (err: any) {
    console.warn("API Key verification failed (expected for invalid key):", err.message || err);
    let rawMsg = err.message || "";
    let errorMsg = "API Key 승인에 실패했습니다. 입력하신 키가 정확한지 확인해 주세요.";

    // Detect specific Gemini API error patterns and map them to friendly Korean messages
    if (rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("API key not valid") || rawMsg.includes("INVALID_ARGUMENT") || rawMsg.includes("400")) {
      errorMsg = "입력하신 Gemini API Key가 유효하지 않거나 올바르지 않습니다. Google AI Studio에서 발급받은 'AIzaSy'로 시작하는 정확한 키 값을 입력해 주시기 바랍니다.";
    } else if (rawMsg.includes("PERMISSION_DENIED") || rawMsg.includes("403")) {
      errorMsg = "해당 API Key는 이 모델(gemini-2.5-flash)을 사용할 권한이 없거나 차단되었습니다.";
    } else if (rawMsg.includes("quota") || rawMsg.includes("QUOTA_EXCEEDED") || rawMsg.includes("429")) {
      errorMsg = "입력하신 API Key의 호출 할당량(Quota)이 초과되었습니다. 잠시 후 다시 시도하거나 다른 키를 사용해 주세요.";
    } else if (typeof rawMsg === "string" && rawMsg.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed.error && parsed.error.message) {
          errorMsg = `API 검증 오류: ${parsed.error.message}`;
        }
      } catch (e) {
        // Fallback
      }
    } else if (rawMsg) {
      // Clean up brackets or JSON-like parts from the error message for aesthetic display
      const cleaned = rawMsg.replace(/ApiError:\s*/g, "").replace(/\{[\s\S]*\}/g, "").trim();
      if (cleaned) {
        errorMsg = `API 검증 실패: ${cleaned}`;
      } else {
        errorMsg = "API Key 승인 실패. 유효한 Gemini API Key를 사용 중인지 확인해 주세요.";
      }
    }

    return res.status(400).json({ error: errorMsg });
  }
});

// API: Generate realistic marketing option examples dynamically based on previous selections
app.post("/api/generate-examples", async (req, res) => {
  try {
    const { step, productFeatures, target } = req.body;

    let client;
    try {
      client = getAiClient(req);
    } catch (err: any) {
      return res.status(401).json({ error: err.message });
    }

    let prompt = "";
    if (step === 2) {
      // Step 2 target suggestions based on Product features
      prompt = `
사용자가 입력한 브랜드/제품 특징: "${productFeatures}"

당신은 10년 차 이상의 베테랑 브랜드 마케팅 디렉터입니다. 이 제품 특징을 가진 브랜드를 공략하기에 적합하고 현실적인 핵심 타겟 오디언스 페르소나 그룹 예시를 5개에서 6개 도출해 주세요.
각 예시는 타겟의 성격, 연령대, 직관적인 필요성이나 라이프스타일을 함축한 구체적인 명사형 그룹 명칭이어야 합니다. (예: "바쁜 아침 시간을 아끼고 싶은 2030 1인 가구 직장인", "스킨케어 성분을 꼼꼼히 비교하는 30대 뷰티 고관여 소비자" 등)

반드시 JSON 문자열 배열 형태 ["타겟1", "타겟2", ...] 로만 응답하십시오. markdown 코드 블록 기호(\`\`\`json)나 부가 설명 없이 대괄호와 따옴표로 감싸진 순수 JSON 배열만 반환해야 합니다. 다른 사족은 절대 포함하지 마십시오.
`;
    } else if (step === 3) {
      // Step 3 budget suggestions based on Product + Target
      prompt = `
브랜드/제품 특징: "${productFeatures}"
핵심 공략 타겟: "${target}"

당신은 10년 차 이상의 베테랑 브랜드 마케팅 디렉터입니다. 이 브랜드와 타겟을 성공적으로 공략하기 위한 마케팅 캠페인 예산 규모 예시를 5개에서 6개 제안해 주세요.
금액 제안은 소규모(~500만원), 중규모(500만~3,000만원), 대규모(3,000만~1억원), 초대형(1억원 이상)의 4가지 예산 가이드라인의 범주 내에 고루 속하도록 다양하게 구성하십시오.
각 예시는 금액과 해당 예산으로 도달 가능한 핵심 액션 요약을 포함해야 합니다. (예: "300만원 (오가닉 인스타그램 릴스 확산 및 체험단 시딩 중심)", "1,500만원 (메타 광고 집행 및 중형 인플루언서 3인 협업)", "5,000만원 (유튜브 마케팅 및 오프라인 홍보존 운영)", "1억 5,000만원 (ATL 디지털 통합 캠페인 및 대규모 팝업스토어 구축)")

반드시 JSON 문자열 배열 형태 ["예산1", "예산2", ...] 로만 응답하십시오. markdown 코드 블록 기호(\`\`\`json)나 부가 설명 없이 대괄호와 따옴표로 감싸진 순수 JSON 배열만 반환해야 합니다. 다른 사족은 절대 포함하지 마십시오.
`;
    } else {
      return res.status(400).json({ error: "Invalid step for generating examples" });
    }

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const text = response.text || "[]";
    const parsedExamples = parseJsonArray(text);
    return res.json({ examples: parsedExamples });
  } catch (error: any) {
    console.error("Error generating examples:", error);
    return res.status(500).json({ error: error.message || "Failed to generate suggestions." });
  }
});

// API: Generate fully tailored, professional campaign proposal
app.post("/api/generate-proposal", async (req, res) => {
  try {
    const { productFeatures, target, budget } = req.body;

    if (!productFeatures || !target || !budget) {
      return res.status(400).json({ error: "Missing required productFeatures, target, or budget parameters." });
    }

    let client;
    try {
      client = getAiClient(req);
    } catch (err: any) {
      return res.status(401).json({ error: err.message });
    }

    const prompt = `
당신은 10년 차 이상의 베테랑 브랜드 마케팅 디렉터입니다. 사용자가 제공한 다음의 핵심 비즈니스 요소를 완벽히 믹싱하여, 즉시 실행 검토가 가능한 정교한 마케팅 캠페인 기획안 초안을 한국어로 작성해 주세요.

[캠페인 조건]
- 제품/브랜드 특징: "${productFeatures}"
- 공략 타겟 오디언스: "${target}"
- 마케팅 예산 규모: "${budget}"

당신은 베테랑 디렉터로서 아래의 구조와 제약 조건을 단 하나의 오차도 없이 100% 준수해야 합니다.

[작성 지침 및 제약조건]
1. 3가지 메인 캠페인 컨셉 도출 (포지셔닝 축 차별화)
   - 3가지 제안은 반드시 서로 다른 전략적 포지셔닝 축을 활용해야 합니다. 아래 5가지 축 중에서 중복 없이 3가지를 엄선하여, 각 컨셉 제목 바로 밑에 \`(포지셔닝 축: OOO)\` 라벨을 명시적으로 표기하십시오.
     - 감성/공감 축 (일상의 페인포인트 공감)
     - 기능/성능 축 (제품 스펙·차별점 직접 소구)
     - 사회적 증거/트렌드 축 (후기, 챌린지, 커뮤니티 확산)
     - 라이프스타일/자기표현 축 (제품을 정체성의 일부로 제시)
     - 문제-해결 서사 축 (Before/After 구조)

2. 컨셉별 3가지 실행 버전(A/B/C) 확장 (소구 방식 고정 및 차별화)
   각 컨셉마다 아래 관점으로 고정된 3가지 확장 버전 실행안을 만드십시오. 버전 간 중복된 기획은 절대 금지합니다.
   - 버전 A (공감 유도형): 정서적 스토리텔링 기반 실행안
   - 버전 B (기능 소구형): 데이터·비교·검증 기반 실행안
   - 버전 C (체험/참여형): 사용자 직접 참여·인터랙션 기반 실행안

3. 예산 구간별 채널 믹스 기준 엄격 반영
   사용자가 입력한 예산 규모("${budget}")를 정밀하게 평가하여, 아래의 4가지 구간 중 어디에 매핑되는지 결정하십시오. 구간 판단의 근거를 기획안 1절 도입부에 구체적인 한 문장으로 명시하고 이에 맞는 채널들만 사용해 실행안을 기획하십시오.
   - 소규모 (예산 500만원 이하): 오가닉 SNS(인스타그램/틱톡 릴스), 마이크로 인플루언서 체험단, 커뮤니티 시딩
   - 중규모 (예산 500만~3,000만원): 퍼포먼스 광고(메타/구글), 중형 인플루언서 협업, 자체 웹 이벤트
   - 대규모 (예산 3,000만~1억원): 매크로 인플루언서/PR, 옥외광고(OOH) 일부, 통합 미디어 바잉
   - 초대형 (예산 1억원 이상): ATL(TV/디지털 통합) + BTL(오프라인 팝업/체험존) + PR 풀 캠페인

4. 문구 분량 및 종결 방식 기준 (가장 중요)
   - 슬로건: 한국어 기준 20자 내외(±5자, 즉 공백 포함 15자~25자 사이)로 가독성 높고 강렬하게 작성하십시오. 글자 수 범위를 어기지 마십시오.
   - 컨셉 정의: 2~3문장 이내로 명확하게 요약하십시오.
   - 버전별 세부 실행안: 각 버전당 정확히 2문장 이내로 작성해야 합니다. (핵심 소구 메시지 변주 1문장 + 구체적인 실행 채널 및 프로그램 아이디어 1문장).

5. 문체 제약사항 (위반 시 비전문적으로 보임)
   - '잘', '적절히', '창의적인', '위트 있게', '효과적으로' 등 모호하고 주관적인 수식어는 일절 사용하지 마십시오.
   - 모든 형용사나 부사는 구체적인 행동, 특정 매체명, 정량적 수치 및 실증적 기법으로 완전히 대체하십시오. (예: '틱톡 릴스 챌린지 개설 후 참여자 상위 100명에게 제품 제공', '구글 디스플레이 타겟 광고 200만 회 노출' 등)
   - 본문의 모든 문장은 말줄임표(...)를 절대 사용하지 않으며, 명확한 마침표(.)가 찍힌 완결된 단문 형태로 끝맺어야 합니다.

6. 최종 산출 이후 후속 피드백 안내 문구 탑재
   기획안의 가장 마지막 라인에는 반드시 다음 문장과 일치하는 글을 한 줄 추가하십시오:
   "특정 컨셉의 톤앤매너, 채널, 예산 배분을 조정하고 싶으시면 말씀해 주세요. 해당 부분만 재작성해 드립니다."

[출력 포맷 (마크다운 양식을 철저히 지키십시오)]

# 1. 전략적 기획 방향성
- [예산 규모 및 타겟 성향 분석에 따라 이번 캠페인이 어떤 마케팅 관점으로 접근해야 효과적인지 정리한 내용 2문장]
- [이번 캠페인에 적용된 예산 구간 및 해당 구간을 선택한 구체적인 판단 근거 1문장]

# 2. 캠페인 기획안

### [컨셉 제1안] 캠페인 네이밍 (포지셔닝 축: OOO)
- **핵심 메시지 (슬로건)**: [슬로건 문구 15~25자]
- **컨셉 정의**: [타겟 공략 포인트를 서술하는 2~3문장 이내의 컨셉 설명]
- **버전별 세부 실행안**:
  - **버전 A (공감 유도형)**: [정서적 스토리텔링 소구 메시지 1문장. 구체적이고 실행가능한 채널/아이디어 1문장.]
  - **버전 B (기능 소구형)**: [데이터/비교 실증 소구 메시지 1문장. 구체적이고 실행가능한 채널/아이디어 1문장.]
  - **버전 C (체험/참여형)**: [인터랙션/참여 소구 메시지 1문장. 구체적이고 실행가능한 채널/아이디어 1문장.]
- **기대효과**: [정량적/정성적 기대 효과를 서술한 1~2문장의 완결된 문장]

### [컨셉 제2안] 캠페인 네이밍 (포지셔닝 축: OOO)
- **핵심 메시지 (슬로건)**: [슬로건 문구 15~25자]
- **컨셉 정의**: [타겟 공략 포인트를 서술하는 2~3문장 이내의 컨셉 설명]
- **버전별 세부 실행안**:
  - **버전 A (공감 유도형)**: [정서적 스토리텔링 소구 메시지 1문장. 구체적이고 실행가능한 채널/아이디어 1문장.]
  - **버전 B (기능 소구형)**: [데이터/비교 실증 소구 메시지 1문장. 구체적이고 실행가능한 채널/아이디어 1문장.]
  - **버전 C (체험/참여형)**: [인터랙션/참여 소구 메시지 1문장. 구체적이고 실행가능한 채널/아이디어 1문장.]
- **기대효과**: [정량적/정성적 기대 효과를 서술한 1~2문장의 완결된 문장]

### [컨셉 제3안] 캠페인 네이밍 (포지셔닝 축: OOO)
- **핵심 메시지 (슬로건)**: [슬로건 문구 15~25자]
- **컨셉 정의**: [타겟 공략 포인트를 서술하는 2~3문장 이내의 컨셉 설명]
- **버전별 세부 실행안**:
  - **버전 A (공감 유도형)**: [정서적 스토리텔링 소구 메시지 1문장. 구체적이고 실행가능한 채널/아이디어 1문장.]
  - **버전 B (기능 소구형)**: [데이터/비교 실증 소구 메시지 1문장. 구체적이고 실행가능한 채널/아이디어 1문장.]
  - **버전 C (체험/참여형)**: [인터랙션/참여 소구 메시지 1문장. 구체적이고 실행가능한 채널/아이디어 1문장.]
- **기대효과**: [정량적/정성적 기대 효과를 서술한 1~2문장의 완결된 문장]

특정 컨셉의 톤앤매너, 채널, 예산 배분을 조정하고 싶으시면 말씀해 주세요. 해당 부분만 재작성해 드립니다.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const proposalText = response.text || "";
    return res.json({ proposal: proposalText });
  } catch (error: any) {
    console.error("Error generating proposal:", error);
    return res.status(500).json({ error: error.message || "Failed to generate proposal." });
  }
});

// API: Revise specified part of the proposal based on user feedback
app.post("/api/revise-proposal", async (req, res) => {
  try {
    const { originalProposal, feedback, productFeatures, target, budget } = req.body;

    if (!originalProposal || !feedback) {
      return res.status(400).json({ error: "Missing originalProposal or feedback parameter." });
    }

    let client;
    try {
      client = getAiClient(req);
    } catch (err: any) {
      return res.status(401).json({ error: err.message });
    }

    const prompt = `
당신은 10년 차 이상의 베테랑 브랜드 마케팅 디렉터입니다. 기존에 당신이 제출했던 마케팅 캠페인 기획안에 대해 사용자가 피드백을 전달했습니다.
기존 기획안을 유지하되, 사용자의 피드백 내용을 정교하게 반영하여 **요청된 특정 컨셉, 실행안 혹은 일부분만 정밀하게 재작성하고 다른 모든 원래 구조와 유지되어야 하는 다른 컨셉들은 훼손 없이 그대로 유지**하십시오.

[기존 컨텍스트 정보]
- 브랜드/제품 특징: "${productFeatures || "기존 설정 유지"}"
- 핵심 공략 타겟: "${target || "기존 설정 유지"}"
- 마케팅 예산 규모: "${budget || "기존 설정 유지"}"

[기존 마케팅 캠페인 기획안]
\`\`\`markdown
${originalProposal}
\`\`\`

[사용자 피드백 / 수정 요청 사항]
"${feedback}"

당신은 베테랑 디렉터로서 아래의 절대 규칙을 완벽하게 고수하면서 기획안의 해당 영역만 업데이트해야 합니다:
1. 슬로건: 한국어 기준 20자 내외(±5자, 공백 포함 15자~25자 사이)로 가독성 높고 강렬하게 작성하십시오. 글자 수 범위를 어기지 마십시오.
2. 컨셉 정의: 2~3문장 이내로 요약하십시오.
3. 버전별 실행안: 각 버전당 정확히 2문장 이내로 구성해야 합니다. (핵심 소구 메시지 변주 1문장 + 구체적인 실행 채널 및 프로그램 아이디어 1문장).
4. 문체 제약사항: '잘', '적절히', '창의적인', '위트 있게', '효과적으로' 등 애매모호하고 주관적인 수식어는 단 하나도 사용해선 안 됩니다. 행동 지침, 수치, 명시적 채널, 실증적 기법만을 기술하십시오.
5. 마침 방식: 모든 문장은 말줄임표(...) 없이 완결성 있는 마침표(.)로 명확하게 종결하십시오.
6. 최종 문구 탑재: 수정본의 가장 하단에도 반드시 다음 후속 안내 문구를 누락하지 말고 정확히 표기하십시오:
   "특정 컨셉의 톤앤매너, 채널, 예산 배분을 조정하고 싶으시면 말씀해 주세요. 해당 부분만 재작성해 드립니다."

완벽하게 정제된 마크다운 포맷의 업데이트된 기획안 전체를 작성해 주십시오.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const revisedText = response.text || "";
    return res.json({ proposal: revisedText });
  } catch (error: any) {
    console.error("Error revising proposal:", error);
    return res.status(500).json({ error: error.message || "Failed to revise proposal." });
  }
});

// Setup Vite Dev Middleware in Development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production from dist/
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
