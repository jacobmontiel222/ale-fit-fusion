import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const languages = [
  { code: 'es', nameKey: 'languages.es', flag: '🇪🇸' },
  { code: 'en', nameKey: 'languages.en', flag: '🇺🇸' },
  { code: 'fr', nameKey: 'languages.fr', flag: '🇫🇷' },
  { code: 'de', nameKey: 'languages.de', flag: '🇩🇪' },
  { code: 'it', nameKey: 'languages.it', flag: '🇮🇹' },
  { code: 'pt', nameKey: 'languages.pt', flag: '🇵🇹' },
  { code: 'pl', nameKey: 'languages.pl', flag: '🇵🇱' },
  { code: 'sq', nameKey: 'languages.sq', flag: '🇦🇱' },
  { code: 'de-CH', nameKey: 'languages.de-CH', flag: '🇨🇭' },
  { code: 'el', nameKey: 'languages.el', flag: '🇬🇷' },
];

interface LanguageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LanguageSelector = ({ open, onOpenChange }: LanguageSelectorProps) => {
  const { i18n, t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  useEffect(() => {
    setSelectedLanguage(i18n.language);
  }, [i18n.language]);

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    i18n.changeLanguage(languageCode);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('languages.selectLanguage')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {languages.map((language) => (
            <Button
              key={language.code}
              variant={selectedLanguage === language.code ? "default" : "ghost"}
              className="w-full justify-between h-auto py-3 px-4"
              onClick={() => handleLanguageChange(language.code)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{language.flag}</span>
                <span className="text-base">{t(language.nameKey)}</span>
              </div>
              {selectedLanguage === language.code && (
                <Check className="w-5 h-5" />
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
