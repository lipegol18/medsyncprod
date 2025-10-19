import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { t } from "@/lib/i18n"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="pointer-events-none">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="header-icon-trigger cursor-not-allowed">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">
              {theme === "dark" ? t("theme.toggleLight") : t("theme.toggleDark")}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            <span>{t("theme.light")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            <span>{t("theme.dark")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}