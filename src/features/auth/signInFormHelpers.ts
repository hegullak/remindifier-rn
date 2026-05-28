type TFunction = (path: string, params?: Record<string, string | number>) => string;

export function strategyLabel(strategy: string, t: TFunction) {
  switch (strategy) {
    case "totp":
      return t("signInForm.strategyTotp");
    case "phone_code":
      return t("signInForm.strategyPhone");
    case "email_code":
      return t("signInForm.strategyEmail");
    case "backup_code":
      return t("signInForm.strategyBackup");
    default:
      return strategy;
  }
}

export function strategyHint(strategy: string, codeSent: boolean, t: TFunction) {
  switch (strategy) {
    case "totp":
      return t("signInForm.hintTotp");
    case "phone_code":
      return codeSent ? t("signInForm.hintPhoneSent") : t("signInForm.hintPhoneSend");
    case "email_code":
      return codeSent ? t("signInForm.hintEmailSent") : t("signInForm.hintEmailSend");
    case "backup_code":
      return t("signInForm.hintBackup");
    default:
      return t("signInForm.hintDefault");
  }
}
