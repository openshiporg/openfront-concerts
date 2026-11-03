"use client";

import React, { useState } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { EditItemDrawerClientWrapper } from "../../components/EditItemDrawerClientWrapper";

interface PaymentProvider {
  id: string;
  name: string;
  code: string;
  isInstalled: boolean;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface PaymentProviderDetailsComponentProps {
  paymentprovider: PaymentProvider;
  list: any;
}

export function PaymentProviderDetailsComponent({
  paymentprovider,
  list,
}: PaymentProviderDetailsComponentProps) {
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  return (
    <>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={paymentprovider.id} className="border-0">
          <div className="px-4 md:px-6 py-3 md:py-4 flex justify-between w-full border-b relative min-h-[80px]">
            <div className="flex items-start gap-4">
              {/* PaymentProvider Info */}
              <div className="flex flex-col items-start text-left gap-2 sm:gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsEditDrawerOpen(true)}
                    className="font-medium text-base hover:text-blue-600 dark:hover:text-blue-400 text-left"
                  >
                    {paymentprovider.name}
                  </button>
                  <span>‧</span>
                  <span className="text-sm font-medium">
                    <span className="text-muted-foreground/75">
                      {paymentprovider.code}
                    </span>
                  </span>
                </div>
                
                {/* Add more fields display here as needed */}
              </div>
            </div>

            <div className="flex flex-col justify-between h-full">
              <div className="flex items-center gap-2">
                <Badge
                  color={paymentprovider.isInstalled ? "emerald" : "zinc"}
                  className="text-[.6rem] sm:text-[.7rem] py-0 px-2 sm:px-3 tracking-wide font-medium rounded-md border h-6"
                >
                  {paymentprovider.isInstalled ? "INSTALLED" : "NOT INSTALLED"}
                </Badge>
                
                {/* Action buttons */}
                <div className="absolute bottom-3 right-5 sm:static flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="border [&_svg]:size-3 h-6 w-6"
                      >
                        <MoreVertical className="stroke-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditDrawerOpen(true)}>
                        Edit Payment Provider
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="border [&_svg]:size-3 h-6 w-6"
                    asChild
                  >
                    <AccordionTrigger className="py-0" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <AccordionContent className="pb-0">
            <div className="px-4 md:px-6 py-3 text-sm text-muted-foreground">
              Manage credentials and adapter functions for this provider.
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Edit Payment Provider Drawer */}
      <EditItemDrawerClientWrapper
        listKey={list.path || list.key}
        itemId={paymentprovider.id}
        open={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
      />
    </>
  );
}
