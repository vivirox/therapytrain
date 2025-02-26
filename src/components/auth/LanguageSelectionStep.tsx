import { useI18nContext } from "@/lib/i18n/i18n-context";
import { Button } from "@/components/ui/button";

interface LanguageSelectionStepProps {
  onLanguageSelect: (language: string) => void;
  selectedLanguage?: string;
  className?: string;
}

export function LanguageSelectionStep({
  onLanguageSelect,
  selectedLanguage,
  className,
}: LanguageSelectionStepProps) {
  const {  } = useI18nContext(); // Removed unused variable

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={selectedLanguage === lang.code ? "default" : "outline"}
            className="w-full"
            onClick={() => onLanguageSelect(lang.code)}
          >
            {lang.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
