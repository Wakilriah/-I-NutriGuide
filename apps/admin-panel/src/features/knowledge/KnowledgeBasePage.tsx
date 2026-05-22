import { useState } from "react";
import { InteractionsPage } from "./InteractionsPage";
import { NutrientsPage } from "./NutrientsPage";
import { SupplementsPage } from "./SupplementsPage";

type KnowledgeTab = "nutrients" | "supplements" | "interactions";

export function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("nutrients");

  return (
    <section className="knowledge-view" aria-labelledby="knowledge-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Knowledge Base</p>
          <h1 id="knowledge-title">Nutrition Data</h1>
        </div>
      </div>

      <div className="tab-row" role="tablist" aria-label="Knowledge base sections">
        <button
          aria-selected={activeTab === "nutrients"}
          className={activeTab === "nutrients" ? "tab-button tab-button-active" : "tab-button"}
          onClick={() => setActiveTab("nutrients")}
          role="tab"
          type="button"
        >
          Nutrients
        </button>
        <button
          aria-selected={activeTab === "supplements"}
          className={activeTab === "supplements" ? "tab-button tab-button-active" : "tab-button"}
          onClick={() => setActiveTab("supplements")}
          role="tab"
          type="button"
        >
          Supplements
        </button>
        <button
          aria-selected={activeTab === "interactions"}
          className={activeTab === "interactions" ? "tab-button tab-button-active" : "tab-button"}
          onClick={() => setActiveTab("interactions")}
          role="tab"
          type="button"
        >
          Interactions
        </button>
      </div>

      {activeTab === "nutrients" ? <NutrientsPage /> : null}
      {activeTab === "supplements" ? <SupplementsPage /> : null}
      {activeTab === "interactions" ? <InteractionsPage /> : null}
    </section>
  );
}
