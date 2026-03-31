import { useEffect, useMemo, useState } from "react";
import { INVOICE_INTAKE_STATUSES } from "../constants/app";
import NoticePanel from "../components/NoticePanel";
import PageActionBar from "../components/PageActionBar";
import SectionTableHeader from "../components/SectionTableHeader";
import StatusBadge from "../components/StatusBadge";
import { extractTextFromImage } from "../utils/photo";
import { styles } from "../utils/uiStyles";
import {
  buildInvoiceAutomationPayload,
  buildInvoiceDraft,
  normalizeInvoiceDraft,
  parseInvoiceTextToDraft,
} from "../utils/invoiceParsing";
import {
  ensureInvoiceQueueLoaded,
  getInvoiceQueue,
  getInvoiceQueueCounts,
  submitInvoiceIntake,
  subscribeInvoiceQueue,
} from "../utils/invoiceQueue";

function InvoiceIntakePage() {
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawExtractedText, setRawExtractedText] = useState("");
  const [invoiceDraft, setInvoiceDraft] = useState(() => buildInvoiceDraft());
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [pageNotice, setPageNotice] = useState({
    tone: "",
    message: "",
  });
  const [invoiceQueue, setInvoiceQueue] = useState(() => getInvoiceQueue());

  const queueCounts = useMemo(
    () => getInvoiceQueueCounts(invoiceQueue),
    [invoiceQueue]
  );

  const invoicePayloadPreview = useMemo(
    () => buildInvoiceAutomationPayload(invoiceDraft),
    [invoiceDraft]
  );

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeInvoiceQueue(() => {
      if (!isMounted) {
        return;
      }

      setInvoiceQueue(getInvoiceQueue());
    });

    ensureInvoiceQueueLoaded()
      .then(() => {
        if (!isMounted) {
          return;
        }

        setInvoiceQueue(getInvoiceQueue());
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        console.warn("[invoice-intake] Failed to load initial invoice queue.", error);
        setPageNotice({
          tone: "warning",
          message:
            error?.message ||
            "Invoice queue could not be loaded. You can still prepare a draft.",
        });
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  function refreshQueue() {
    setInvoiceQueue(getInvoiceQueue());
  }

  function setDraftAndClearNotice(nextDraft) {
    setInvoiceDraft(normalizeInvoiceDraft(nextDraft));
    setPageNotice({ tone: "", message: "" });
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    if (!file) {
      setSelectedImage("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setSelectedImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function handleProcessImage() {
    if (!selectedFile) {
      setPageNotice({
        tone: "warning",
        message: "Select an invoice image before OCR processing.",
      });
      return;
    }

    try {
      setIsProcessingImage(true);
      setPageNotice({
        tone: "info",
        message: "Processing invoice image with OCR...",
      });
      const text = await extractTextFromImage(selectedFile);
      setRawExtractedText(text);
      setDraftAndClearNotice(parseInvoiceTextToDraft(text, invoiceDraft));
      setPageNotice({
        tone: "success",
        message: "OCR complete. Review and adjust invoice fields before sending.",
      });
    } catch (error) {
      setPageNotice({
        tone: "error",
        message:
          error?.message || "Failed to process invoice image. Try again.",
      });
    } finally {
      setIsProcessingImage(false);
    }
  }

  function handleProcessText() {
    setDraftAndClearNotice(parseInvoiceTextToDraft(rawExtractedText, invoiceDraft));
    setPageNotice({
      tone: "success",
      message: "Invoice text parsed. Confirm supplier, invoice data and line items.",
    });
  }

  function handleFieldChange(field, value) {
    setDraftAndClearNotice({
      ...invoiceDraft,
      [field]: value,
      status: INVOICE_INTAKE_STATUSES.DRAFT,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleItemChange(index, field, value) {
    const nextItems = (invoiceDraft.items || []).map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    );
    setDraftAndClearNotice({
      ...invoiceDraft,
      items: nextItems,
      status: INVOICE_INTAKE_STATUSES.DRAFT,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleAddItemRow() {
    setDraftAndClearNotice({
      ...invoiceDraft,
      items: [
        ...(invoiceDraft.items || []),
        { itemName: "", quantity: 0, unitPrice: 0, lineTotal: 0 },
      ],
      status: INVOICE_INTAKE_STATUSES.DRAFT,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleRemoveItemRow(index) {
    const nextItems = (invoiceDraft.items || []).filter(
      (_, itemIndex) => itemIndex !== index
    );
    setDraftAndClearNotice({
      ...invoiceDraft,
      items:
        nextItems.length > 0
          ? nextItems
          : [{ itemName: "", quantity: 0, unitPrice: 0, lineTotal: 0 }],
      status: INVOICE_INTAKE_STATUSES.DRAFT,
      updatedAt: new Date().toISOString(),
    });
  }

  async function handleSendInvoiceToBot() {
    const hasValidItems = (invoiceDraft.items || []).some(
      (item) => String(item.itemName || "").trim() && Number(item.quantity || 0) > 0
    );

    if (!hasValidItems) {
      setPageNotice({
        tone: "warning",
        message: "Add at least one valid invoice item before sending to bot.",
      });
      return;
    }

    try {
      setIsSendingInvoice(true);
      const result = await submitInvoiceIntake(invoiceDraft);

      if (result.invoice) {
        setInvoiceDraft(result.invoice);
      }

      setPageNotice({
        tone: result.ok ? "success" : "error",
        message: result.ok
          ? result.reason === "queued"
            ? "Invoice queued successfully. Run bot execution from Invoice Queue."
            : "Invoice execution completed successfully."
          : result.errorMessage || "Invoice execution failed.",
      });
      refreshQueue();
    } catch (error) {
      refreshQueue();
      setPageNotice({
        tone: "error",
        message: error?.message || "Failed to send invoice to backend.",
      });
    } finally {
      setIsSendingInvoice(false);
    }
  }

  function handleStartNewInvoice() {
    setSelectedImage("");
    setSelectedFile(null);
    setRawExtractedText("");
    setInvoiceDraft(buildInvoiceDraft());
    setPageNotice({
      tone: "info",
      message: "New invoice draft ready.",
    });
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: "30px", fontWeight: 600 }}>Invoice Intake</h1>

      <PageActionBar>
        <button
          onClick={handleStartNewInvoice}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#334155",
          }}
        >
          New Invoice Draft
        </button>
      </PageActionBar>

      <PageActionBar marginBottom="14px">
        <StatusBadge
          label="Queue Total"
          value={queueCounts.total}
          backgroundColor="#1f1f1f"
          textColor="white"
        />
        <StatusBadge
          label="Queued"
          value={queueCounts.queued}
          backgroundColor="#fff3e0"
          textColor="#ff9800"
        />
        <StatusBadge
          label="Failed"
          value={queueCounts.failed}
          backgroundColor="#ffebee"
          textColor="#d9534f"
        />
        <StatusBadge
          label="Executed"
          value={queueCounts.executed}
          backgroundColor="#e8f5e9"
          textColor="#4CAF50"
        />
      </PageActionBar>

      {pageNotice.message && (
        <NoticePanel
          backgroundColor={
            pageNotice.tone === "error"
              ? "#3a1f1f"
              : pageNotice.tone === "warning"
                ? "#2b2410"
                : pageNotice.tone === "success"
                  ? "#102410"
                  : "#1f1f1f"
          }
          border={
            pageNotice.tone === "error"
              ? "1px solid #7a2d2d"
              : pageNotice.tone === "warning"
                ? "1px solid #6d5b2f"
                : pageNotice.tone === "success"
                  ? "1px solid #2f6f2f"
                  : "1px solid #555"
          }
          color={
            pageNotice.tone === "error"
              ? "#ffb3b3"
              : pageNotice.tone === "warning"
                ? "#ffe39a"
                : pageNotice.tone === "success"
                  ? "#9be79b"
                  : "#8de0ea"
          }
        >
          {pageNotice.message}
        </NoticePanel>
      )}

      <div style={{ ...styles.darkPanel, marginBottom: "18px" }}>
        <div style={{ marginBottom: "14px", fontSize: "13px", color: "#94a3b8" }}>
          Upload and review invoice data before sending it to the bot queue.
        </div>
        <input type="file" accept="image/*" onChange={handleImageChange} />
      </div>

      {selectedImage && (
        <div style={{ ...styles.darkPanel, marginBottom: "18px" }}>
          <img
            src={selectedImage}
            alt="Selected invoice"
            style={{
              maxWidth: "100%",
              maxHeight: "320px",
              borderRadius: "12px",
              border: "1px solid #1f2937",
            }}
          />
        </div>
      )}

      <PageActionBar>
        <button
          onClick={handleProcessImage}
          disabled={!selectedFile || isProcessingImage}
          style={{
            ...styles.primaryButton,
            backgroundColor:
              !selectedFile || isProcessingImage ? "#64748b" : "#2563eb",
            cursor:
              !selectedFile || isProcessingImage ? "not-allowed" : "pointer",
          }}
        >
          {isProcessingImage ? "Processing Image..." : "Process Invoice Image"}
        </button>

        <button
          onClick={handleProcessText}
          disabled={isProcessingImage}
          style={{
            ...styles.primaryButton,
            backgroundColor: isProcessingImage ? "#64748b" : "#0ea5e9",
            cursor: isProcessingImage ? "not-allowed" : "pointer",
          }}
        >
          Parse OCR Text
        </button>
      </PageActionBar>

      <div style={{ ...styles.darkPanel, marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "12px", fontWeight: 600 }}>OCR Raw Text</h2>
        <textarea
          value={rawExtractedText}
          onChange={(event) => setRawExtractedText(event.target.value)}
          placeholder={`Supplier: Example Foods
Invoice Number: INV-1002
Invoice Date: 2026-03-19
Item A 12 2.5 30
Item B 5 8.4 42`}
          style={{
            ...styles.input,
            minHeight: "150px",
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ ...styles.darkPanel, marginBottom: "16px" }}>
        <h2 style={{ marginTop: 0 }}>Invoice Review</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <input
            value={invoiceDraft.supplier || ""}
            onChange={(event) => handleFieldChange("supplier", event.target.value)}
            placeholder="Supplier"
            style={styles.input}
          />
          <input
            value={invoiceDraft.invoiceNumber || ""}
            onChange={(event) =>
              handleFieldChange("invoiceNumber", event.target.value)
            }
            placeholder="Invoice Number"
            style={styles.input}
          />
          <input
            value={invoiceDraft.invoiceDate || ""}
            onChange={(event) => handleFieldChange("invoiceDate", event.target.value)}
            placeholder="Invoice Date"
            style={styles.input}
          />
        </div>

        <div
          style={{
            border: "1px solid #1f2937",
            borderRadius: "12px",
            overflow: "hidden",
            marginBottom: "12px",
          }}
        >
          <SectionTableHeader
            columns={["Item", "Qty", "Unit Price", "Line Total", "Action"]}
            gridTemplateColumns="1.4fr 0.7fr 0.8fr 0.9fr 90px"
          />

          {(invoiceDraft.items || []).map((item, index) => (
            <div
              key={`${invoiceDraft.id}-item-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.7fr 0.8fr 0.9fr 90px",
                gap: "8px",
                alignItems: "center",
                padding: "10px 12px",
                borderBottom: "1px solid #1f2937",
                backgroundColor: "rgba(15, 23, 42, 0.76)",
              }}
            >
              <input
                value={item.itemName}
                onChange={(event) =>
                  handleItemChange(index, "itemName", event.target.value)
                }
                placeholder="Item name"
                style={styles.input}
              />
              <input
                type="number"
                min="0"
                step="any"
                value={item.quantity}
                onChange={(event) =>
                  handleItemChange(index, "quantity", event.target.value)
                }
                style={styles.input}
              />
              <input
                type="number"
                min="0"
                step="any"
                value={item.unitPrice}
                onChange={(event) =>
                  handleItemChange(index, "unitPrice", event.target.value)
                }
                style={styles.input}
              />
              <input
                type="number"
                min="0"
                step="any"
                value={item.lineTotal}
                onChange={(event) =>
                  handleItemChange(index, "lineTotal", event.target.value)
                }
                style={styles.input}
              />
              <button
                onClick={() => handleRemoveItemRow(index)}
                style={styles.deleteButton}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <PageActionBar marginBottom="0">
          <button
            onClick={handleAddItemRow}
            style={{
              ...styles.primaryButton,
              backgroundColor: "#334155",
            }}
          >
            Add Item Row
          </button>

          <button
            onClick={handleSendInvoiceToBot}
            disabled={isSendingInvoice}
            style={{
              ...styles.primaryButton,
              backgroundColor: isSendingInvoice ? "#64748b" : "#00b894",
              cursor: isSendingInvoice ? "not-allowed" : "pointer",
            }}
          >
            {isSendingInvoice ? "Sending Invoice..." : "Send Invoice To Bot"}
          </button>

          <StatusBadge
            label="Draft Status"
            value={invoiceDraft.status || INVOICE_INTAKE_STATUSES.DRAFT}
            backgroundColor="#1f1f1f"
            textColor="#8de0ea"
          />
          <StatusBadge
            label="Attempts"
            value={invoiceDraft.attempts || 0}
            backgroundColor="#1f1f1f"
            textColor="white"
          />
          <StatusBadge
            label="Total Amount"
            value={invoiceDraft.totalAmount || 0}
            backgroundColor="#1f1f1f"
            textColor="#9be79b"
          />
        </PageActionBar>
      </div>

      <div style={{ ...styles.darkPanel, marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "12px", fontWeight: 600 }}>
          Invoice Payload Preview
        </h2>
        <textarea
          readOnly
          value={JSON.stringify(invoicePayloadPreview, null, 2)}
          style={{
            ...styles.input,
            minHeight: "210px",
            resize: "vertical",
          }}
        />
      </div>
    </div>
  );
}

export default InvoiceIntakePage;
