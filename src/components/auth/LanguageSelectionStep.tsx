import React from 'react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { supportedLngs } from '@/lib/i18n/i18n-context';

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  nativeName: string;
}

const languageOptions: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

interface LanguageSelectionStepProps {
  onLanguageSelect: (language: string) => void;
  selectedLanguage?: string;
  className?: string;
}

export const LanguageSelectionStep: React.FC<LanguageSelectionStepProps> = ({
  onLanguageSelect,
  selectedLanguage,
  className,
}) => {
  const { currentLanguage } = useTranslation();
  const [previewLanguage, setPreviewLanguage] = React.useState<string | null>(null);

  // Get browser language for initial suggestion
  React.useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (supportedLngs.includes(browserLang) && !selectedLanguage) {
      setPreviewLanguage(browserLang);
    }
  }, [selectedLanguage]);

  const handleLanguageSelect = (language: string) => {
    setPreviewLanguage(null);
    onLanguageSelect(language);
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center">
          Choose Your Language
        </h2>
        <p className="text-center text-gray-500">
          Select your preferred language for the best experience
        </p>

        {previewLanguage && !selectedLanguage && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              We detected your browser language: {' '}
              <span className="font-medium">
                {languageOptions.find(lang => lang.code === previewLanguage)?.name}
              </span>
            </p>
            <div className="mt-2 flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewLanguage(null)}
              >
                No, thanks
              </Button>
              <Button
                size="sm"
                onClick={() => handleLanguageSelect(previewLanguage)}
              >
                Use this language
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {languageOptions.map((language) => (
            <Button
              key={language.code}
              variant={selectedLanguage === language.code ? 'default' : 'outline'}
              className={`
                w-full justify-start space-x-3 py-6
                ${selectedLanguage === language.code ? 'ring-2 ring-primary' : ''}
              `}
              onClick={() => handleLanguageSelect(language.code)}
            >
              <span className="text-2xl">{language.flag}</span>
              <div className="text-left">
                <div className="font-medium">{language.name}</div>
                <div className="text-sm text-gray-500">{language.nativeName}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}; 