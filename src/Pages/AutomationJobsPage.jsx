import { useState } from "react";
import { styles } from "../utils/uiStyles";
import AutomationJobCard from "../components/AutomationJobCard";
import NoticePanel from "../components/NoticePanel";
import PageActionBar from "../components/PageActionBar";
import StatusBadge from "../components/StatusBadge";
import { useAutomationJobs } from "../hooks/useAutomationJobs";

function buildConfirmationState() {
  return {
    type: "",
    jobId: "",
  };
}

function getConfirmationCopy(type) {
  if (type === "run") {
    return {
      title: "Confirmar envio",
      message:
        "Tem certeza que deseja enviar este job para o bot preencher no portal?",
      confirmLabel: "Enviar para o bot",
    };
  }

  return {
    title: "Confirmar exclusão",
    message:
      "Tem certeza que deseja deletar este job? Essa ação não pode ser desfeita.",
    confirmLabel: "Deletar job",
  };
}

function AutomationJobsPage() {
  const {
    loading,
    errorMessage,
    canManageJobs,
    counts,
    lastSuccessfulQuantities,
    jobs,
    handleRunJob,
    handleDeleteJob,
    pendingAction,
  } = useAutomationJobs();
  const [confirmation, setConfirmation] = useState(buildConfirmationState);

  const confirmationCopy = getConfirmationCopy(confirmation.type);

  function closeConfirmation() {
    if (pendingAction.jobId) {
      return;
    }

    setConfirmation(buildConfirmationState());
  }

  function requestRun(jobId) {
    setConfirmation({
      type: "run",
      jobId,
    });
  }

  function requestDelete(jobId) {
    setConfirmation({
      type: "delete",
      jobId,
    });
  }

  async function handleConfirmAction() {
    if (!confirmation.jobId) {
      return;
    }

    const nextConfirmation = confirmation;
    setConfirmation(buildConfirmationState());

    if (nextConfirmation.type === "run") {
      await handleRunJob(nextConfirmation.jobId);
      return;
    }

    await handleDeleteJob(nextConfirmation.jobId);
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: "30px", fontWeight: 600 }}>Automation Jobs</h1>

      <NoticePanel
        backgroundColor="#1f1f1f"
        border="1px solid #24344d"
        color="#cbd5e1"
        fontWeight="normal"
      >
        Cada job pode ser enviado para o bot preencher o portal ou removido da fila.
        O status agora é automático: idle → running → done/failed.
      </NoticePanel>

      {!canManageJobs ? (
        <NoticePanel
          backgroundColor="#2b2410"
          border="1px solid #6d5b2f"
          color="#ffe39a"
        >
          Apenas administradores podem enviar ou deletar jobs.
        </NoticePanel>
      ) : null}

      {errorMessage ? (
        <NoticePanel
          backgroundColor="#3a1f1f"
          border="1px solid #7a2d2d"
          color="#ffb3b3"
        >
          {errorMessage}
        </NoticePanel>
      ) : null}

      <PageActionBar>
        <StatusBadge label="Total" value={counts.total} backgroundColor="#1f1f1f" textColor="white" />
        <StatusBadge label="Idle" value={counts.pending} backgroundColor="#fff3e0" textColor="#ff9800" />
        <StatusBadge label="Running" value={counts.running} backgroundColor="#e3f2fd" textColor="#2196F3" />
        <StatusBadge label="Done" value={counts.done} backgroundColor="#e8f5e9" textColor="#4CAF50" />
        <StatusBadge label="Failed" value={counts.failed} backgroundColor="#ffebee" textColor="#d9534f" />
      </PageActionBar>

      {loading ? (
        <div style={styles.emptyState}>Loading automation jobs...</div>
      ) : jobs.length === 0 ? (
        <div style={styles.emptyState}>No automation jobs found.</div>
      ) : (
        jobs.map((job) => (
          <AutomationJobCard
            key={job.jobId}
            job={job}
            canManage={canManageJobs}
            lastSuccessfulQuantities={lastSuccessfulQuantities}
            pendingAction={pendingAction}
            onRun={requestRun}
            onDelete={requestDelete}
          />
        ))
      )}

      {confirmation.jobId ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(2, 6, 23, 0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1200,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              borderRadius: "16px",
              border: "1px solid #24344d",
              backgroundColor: "#0f172a",
              boxShadow: "0 20px 36px rgba(0, 0, 0, 0.28)",
              padding: "20px",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#f8fafc",
                marginBottom: "10px",
              }}
            >
              {confirmationCopy.title}
            </div>

            <div
              style={{
                color: "#cbd5e1",
                lineHeight: 1.6,
                marginBottom: "18px",
              }}
            >
              {confirmationCopy.message}
            </div>

            <PageActionBar marginBottom="0">
              <button
                onClick={closeConfirmation}
                disabled={Boolean(pendingAction.jobId)}
                style={{
                  ...styles.primaryButton,
                  backgroundColor: "#334155",
                  cursor: pendingAction.jobId ? "not-allowed" : "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmAction}
                disabled={Boolean(pendingAction.jobId)}
                style={{
                  ...styles.primaryButton,
                  backgroundColor:
                    confirmation.type === "delete" ? "#ef4444" : "#2563eb",
                  cursor: pendingAction.jobId ? "not-allowed" : "pointer",
                }}
              >
                {pendingAction.jobId ? "Processando..." : confirmationCopy.confirmLabel}
              </button>
            </PageActionBar>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AutomationJobsPage;
