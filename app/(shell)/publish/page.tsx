import { PublishEditor } from '@/components/publish/PublishEditor';

export default function PublishPage() {
  return (
    <div>
      <h1 className="text-[24px] font-semibold mb-2">Publish</h1>
      <p className="text-[14px] text-text-secondary mb-8">
        Register a tool manifest for agent discovery and secure proxying.
      </p>
      <PublishEditor />
    </div>
  );
}
