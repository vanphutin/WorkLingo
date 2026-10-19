type SearchableGroup = { name: string; nameEn?: string | null | undefined; aliases?: readonly string[] | undefined };
const searchKey = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').replace(/đ/gu, 'd').replace(/Đ/gu, 'D').toLowerCase().trim();
export const topicGroupLabel = (group: SearchableGroup, locale: 'vi' | 'en') => locale === 'en' && group.nameEn ? group.nameEn : group.name;
export const matchesTopicGroup = (group: SearchableGroup, query: string) => [group.name, group.nameEn ?? '', ...(group.aliases ?? [])]
  .some(name => searchKey(name).includes(searchKey(query)));
