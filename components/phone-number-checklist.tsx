// PhoneNumberChecklist.tsx
import React, { useState } from "react";
import { Card } from "./ui/card";
import { CheckCircle, Circle, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";

type PhoneNumberChecklistProps = {
  selectedPhoneNumber: string;
  allConfigsReady: boolean;
  setAllConfigsReady: (ready: boolean) => void;
};

const PhoneNumberChecklist: React.FC<PhoneNumberChecklistProps> = ({
  selectedPhoneNumber,
  allConfigsReady,
  setAllConfigsReady,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <Card className="flex items-center justify-between p-4">
      <div className="flex flex-col">
        <span className="text-sm text-gray-500">Number</span>
        <div className="flex items-center">
          <span className="font-medium w-36">
            {isVisible ? selectedPhoneNumber || "None" : "••••••••••"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(!isVisible)}
            className="h-8 w-8"
          >
            {isVisible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {allConfigsReady ? (
            <CheckCircle className="text-green-500 w-4 h-4" />
          ) : (
            <Circle className="text-gray-400 w-4 h-4" />
          )}
          <span className="text-sm text-gray-700">
            {allConfigsReady ? "Setup Ready" : "Setup Not Ready"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAllConfigsReady(false)}
        >
          Checklist
        </Button>
      </div>
    </Card>
  );
};

export default PhoneNumberChecklist;
