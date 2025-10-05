import React from "react";

// This visually matches the PDF layout (colors, spacing). QR is a placeholder box here.
// The real PDF places a live QR code. Officials scan the guest’s PDF on phone.

export default function InvitePreview({ studentName, guestName, event }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        display: "grid",
        gridTemplateColumns: "1fr 240px",
        gap: 16,
        background: "#fff",
      }}
    >
      <div>
        <div
          style={{
            background: "#0c2745",
            color: "#fff",
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700 }}>{event.title}</div>
          <div style={{ opacity: 0.9 }}>Official Guest Invite</div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
          Guest: {guestName}
        </div>
        <div style={{ marginTop: 6 }}>Student: {studentName}</div>
        <div style={{ marginTop: 8 }}>
          <b>Date:</b> {event.date} &nbsp; • &nbsp;<b>Time:</b> {event.time}
        </div>
        <div style={{ marginTop: 6 }}>
          <b>Venue:</b> {event.venue}
        </div>
        <div style={{ marginTop: 12, color: "#4b5563", fontSize: 14 }}>
          {event.notes}
        </div>
        <div style={{ marginTop: 18, color: "#6b7280", fontSize: 12 }}>
          Non-transferable • Single entry • ID may be requested
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            border: "2px dashed #9ca3af",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
          }}
        >
          QR PREVIEW
        </div>
      </div>
    </div>
  );
}
