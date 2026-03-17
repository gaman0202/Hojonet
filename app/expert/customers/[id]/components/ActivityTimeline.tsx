import { ActivityHistory } from '../types';
import { DocumentIcon, CheckIcon, SparkleIcon } from '@/components/icons';

interface ActivityTimelineProps {
  activities: ActivityHistory[];
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getActivityIcon = (iconType: string) => {
    const iconProps = { size: 16, color: '#9810FA' };
    switch (iconType) {
      case 'document':
        return <DocumentIcon {...iconProps} />;
      case 'check':
        return <CheckIcon {...iconProps} />;
      case 'plus':
        return <DocumentIcon {...iconProps} />;
      case 'user':
        return <SparkleIcon {...iconProps} />;
      default:
        return <DocumentIcon {...iconProps} />;
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex flex-row items-start gap-3 sm:gap-4">
          {/* Icon and Line */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-[#F3E8FF] rounded-full">
              {getActivityIcon(activity.icon)}
            </div>
            {index < activities.length - 1 && (
              <div className="w-0.5 h-6 sm:h-8 bg-[#E5E7EB]" />
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1 flex-grow min-w-0">
            <p className="text-xs sm:text-sm font-normal leading-5 tracking-[-0.150391px] text-[#101828] break-words">
              {activity.description}
            </p>
            <p className="text-xs font-normal leading-4 text-[#6A7282]">
              {activity.date}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
