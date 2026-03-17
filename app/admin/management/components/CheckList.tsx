import { CheckIcon, DocumentIcon } from '@/components/icons';

interface CheckListProps {
  title: string;
  items: string[];
  iconType?: 'check' | 'document';
}

export function CheckList({ title, items, iconType = 'check' }: CheckListProps) {
  const IconComponent = iconType === 'check' ? CheckIcon : DocumentIcon;
  const iconColor = iconType === 'check' ? '#00A63E' : '#155DFC';

  return (
    <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6 p-4 sm:p-6 lg:px-6 lg:py-6 w-full bg-white border border-[#E5E7EB] rounded-[14px]">
      <h2 className="text-base sm:text-lg lg:text-[18px] font-normal leading-6 sm:leading-7 lg:leading-7 tracking-[-0.439453px] text-[#101828]">
        {title}
      </h2>
      <ul className="flex flex-col gap-2 sm:gap-2.5 lg:gap-2">
        {items.map((item, index) => (
          <li key={index} className="flex flex-row items-start sm:items-center gap-2">
            <IconComponent size={18} color={iconColor} className="mt-0.5 sm:mt-0 lg:mt-0 flex-shrink-0 lg:w-5 lg:h-5" />
            <span className="text-sm sm:text-base font-normal leading-5 sm:leading-6 lg:leading-6 tracking-[-0.3125px] text-[#364153] break-words">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
