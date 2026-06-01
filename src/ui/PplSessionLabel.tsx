import { Text } from "react-native";
import { PPL_SESSIONS, type PplSession } from "@/lib/brief/pplTraining";

function sessionLabel(session: PplSession): string {
  return session.charAt(0).toUpperCase() + session.slice(1);
}

/**
 * Push-Pull-Legs with the active session emphasized (e.g. Pull on pull day).
 * Session names stay in English in all locales.
 */
export function PplSessionLabel({
  active,
  className = "",
}: {
  active: PplSession;
  className?: string;
}) {
  return (
    <Text className={`text-body-lg font-body ${className}`.trim()}>
      {PPL_SESSIONS.map((session, index) => {
        const isActive = session === active;
        return (
          <Text key={session}>
            {index > 0 ? <Text className="text-text3">-</Text> : null}
            <Text
              className={isActive ? "text-accent font-bodySemi" : "text-text1"}
              style={isActive ? { fontSize: 16 } : undefined}
            >
              {sessionLabel(session)}
            </Text>
          </Text>
        );
      })}
    </Text>
  );
}
