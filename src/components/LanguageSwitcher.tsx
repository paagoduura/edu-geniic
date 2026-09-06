import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks/useLanguage';

const languages = [
  { code: 'english', name: 'English', flag: '🇬🇧' },
  { code: 'french', name: 'Français', flag: '🇫🇷' },
  { code: 'arabic', name: 'العربية', flag: '🇸🇦' },
  { code: 'hausa', name: 'Hausa', flag: '🇳🇬' },
  { code: 'yoruba', name: 'Yorùbá', flag: '🇳🇬' },
  { code: 'igbo', name: 'Igbo', flag: '🇳🇬' },
  { code: 'mandarin', name: '简体中文', flag: '🇨🇳' },
  { code: 'portuguese', name: 'Português', flag: '🇵🇹' },
  { code: 'spanish', name: 'Español', flag: '🇪🇸' },
];

export const LanguageSwitcher = () => {
  const { currentLanguage, setLanguage, isLoading } = useLanguage();
  
  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading} className="gap-2">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang.flag} {currentLang.name}</span>
          <span className="sm:hidden">{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Select Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code as any)}
            className={currentLanguage === lang.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
