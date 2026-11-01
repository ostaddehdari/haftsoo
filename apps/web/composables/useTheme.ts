export type ThemeName = "light" | "dark";

export function useTheme() {
  const theme = useState<ThemeName>("theme", () => "light");
  const apply = (value: ThemeName) => {
    theme.value = value;
    if (import.meta.client) {
      document.documentElement.dataset.theme = value;
      localStorage.setItem("haftsoo-theme", value);
    }
  };
  const toggle = () => apply(theme.value === "dark" ? "light" : "dark");
  onMounted(() => {
    const saved = localStorage.getItem("haftsoo-theme") as ThemeName | null;
    apply(saved ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  });
  return { theme, apply, toggle };
}
