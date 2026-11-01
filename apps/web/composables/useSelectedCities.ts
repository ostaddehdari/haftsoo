export type CityOption = { name: string; slug: string; province: string };

export const popularCities: CityOption[] = [
  { name: "تهران", slug: "tehran", province: "تهران" },
  { name: "مشهد", slug: "mashhad", province: "خراسان رضوی" },
  { name: "اصفهان", slug: "isfahan", province: "اصفهان" },
  { name: "شیراز", slug: "shiraz", province: "فارس" },
  { name: "کرج", slug: "karaj", province: "البرز" },
  { name: "تبریز", slug: "tabriz", province: "آذربایجان شرقی" },
  { name: "اهواز", slug: "ahvaz", province: "خوزستان" },
  { name: "قم", slug: "qom", province: "قم" },
  { name: "کرمانشاه", slug: "kermanshah", province: "کرمانشاه" },
  { name: "رشت", slug: "rasht", province: "گیلان" },
  { name: "ارومیه", slug: "urmia", province: "آذربایجان غربی" },
  { name: "یزد", slug: "yazd", province: "یزد" }
];

export function useSelectedCities() {
  const cookie = useCookie<string>("hs-cities", { default: () => "isfahan", sameSite: "lax" });
  const cities = useState<CityOption[]>("selected-cities", () => {
    const slugs = (cookie.value || "isfahan").split(",");
    return popularCities.filter((city) => slugs.includes(city.slug));
  });
  const setCities = (next: CityOption[]) => {
    cities.value = next.length ? next.slice(0, 10) : [popularCities[2]!];
    cookie.value = cities.value.map((city) => city.slug).join(",");
  };
  return { cities, setCities };
}
