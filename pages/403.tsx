import type { NextPage } from "next";
import Link from "next/link";
import { AC } from "../lib/format";

const Forbidden: NextPage = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F7F8FB",
        fontFamily: "inherit",
      }}
    >
      <div style={{ textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-.04em", color: AC, lineHeight: 1 }}>
          403
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#14161F", marginTop: 8 }}>
          You don’t have access to this area
        </div>
        <div style={{ fontSize: 13.5, color: "#6B7180", fontWeight: 500, marginTop: 6, maxWidth: 380, margin: "6px auto 0" }}>
          Your account role doesn’t include permission to view this module. Contact your administrator if you believe this is a mistake.
        </div>
        <div style={{ marginTop: 20 }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              height: 40,
              lineHeight: "38px",
              padding: "0 20px",
              borderRadius: 11,
              background: AC,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;