/**
 * @deprecated modifications to this file should be v2 only
 * Use `/apps/web/pages/v2/availability/[schedule].tsx` instead
 */
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { DEFAULT_SCHEDULE, availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { stringOrNumber } from "@calcom/prisma/zod-utils";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/Button";
import { BadgeCheckIcon } from "@calcom/ui/Icon";
import Shell from "@calcom/ui/Shell";
import Switch from "@calcom/ui/Switch";
import TimezoneSelect from "@calcom/ui/form/TimezoneSelect";
import { Form } from "@calcom/ui/form/fields";

import { QueryCell } from "@lib/QueryCell";
import { HttpError } from "@lib/core/http/error";

import Schedule from "@components/availability/Schedule";
import EditableHeading from "@components/ui/EditableHeading";

/**
 * @deprecated modifications to this file should be v2 only
 * Use `/apps/web/pages/v2/availability/[schedule].tsx` instead
 */
export function AvailabilityForm(props: inferQueryOutput<"viewer.availability.schedule">) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const form = useForm({
    defaultValues: {
      schedule: props.availability || DEFAULT_SCHEDULE,
      isDefault: !!props.isDefault,
      timeZone: props.timeZone,
    },
  });

  const updateMutation = trpc.useMutation("viewer.availability.schedule.update", {
    onSuccess: async ({ schedule }) => {
      await utils.invalidateQueries(["viewer.availability.schedule"]);
      await router.push("/availability");
      showToast(
        t("availability_updated_successfully", {
          scheduleName: schedule.name,
        }),
        "success"
      );
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  return (
    <Form
      form={form}
      handleSubmit={async (values) => {
        updateMutation.mutate({
          scheduleId: parseInt(router.query.schedule as string, 10),
          name: props.schedule.name,
          ...values,
        });
      }}
      className="grid grid-cols-3 gap-2">
      <div className="col-span-3 space-y-2 lg:col-span-2">
        <div className="divide-y rounded-sm border border-gray-200 bg-white px-4 py-5 sm:p-6">
          <h3 className="mb-5 text-base font-medium leading-6 text-gray-900">{t("change_start_end")}</h3>
          <Schedule name="schedule" />
        </div>
        <div className="space-x-2 text-right">
          <Button color="secondary" href="/availability" tabIndex={-1}>
            {t("cancel")}
          </Button>
          <Button>{t("save")}</Button>
        </div>
      </div>
      <div className="min-w-40 col-span-3 ml-2 space-y-2 lg:col-span-1">
        {props.isDefault ? (
          <div className="inline-block cursor-default rounded border border-gray-300 bg-gray-200 px-2 py-0.5 pl-1.5 text-sm font-medium text-neutral-800">
            <span className="flex items-center">
              <BadgeCheckIcon className="mr-1 h-4 w-4" /> {t("default")}
            </span>
          </div>
        ) : (
          <Controller
            name="isDefault"
            render={({ field: { onChange, value } }) => (
              <Switch label={t("set_to_default")} onCheckedChange={onChange} checked={value} />
            )}
          />
        )}
        <div>
          <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
            {t("timezone")}
          </label>
          <div className="mt-1">
            <Controller
              name="timeZone"
              render={({ field: { onChange, value } }) => (
                <TimezoneSelect
                  value={value}
                  className="focus:border-brand mt-1 block w-full rounded-md border-gray-300 text-sm"
                  onChange={(timezone) => onChange(timezone.value)}
                />
              )}
            />
          </div>
        </div>
        <div className="mt-2 rounded-sm border border-gray-200 px-4 py-5 sm:p-6 ">
          <h3 className="text-base font-medium leading-6 text-gray-900">
            {t("something_doesnt_look_right")}
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>{t("troubleshoot_availability")}</p>
          </div>
          <div className="mt-5">
            <Button href="/availability/troubleshoot" color="secondary">
              {t("launch_troubleshooter")}
            </Button>
          </div>
        </div>
      </div>
    </Form>
  );
}

const querySchema = z.object({
  schedule: stringOrNumber,
});

export default function Availability() {
  const router = useRouter();
  const { i18n } = useLocale();
  const { schedule: scheduleId } = router.isReady ? querySchema.parse(router.query) : { schedule: -1 };
  const query = trpc.useQuery(["viewer.availability.schedule", { scheduleId }], { enabled: router.isReady });
  const [name, setName] = useState<string>();
  return (
    <div>
      <QueryCell
        query={query}
        success={({ data }) => {
          return (
            <Shell
              heading={<EditableHeading title={name || data.schedule.name} onChange={setName} />}
              subtitle={data.schedule.availability.map((availability) => (
                <span key={availability.id}>
                  {availabilityAsString(availability, { locale: i18n.language })}
                  <br />
                </span>
              ))}>
              <AvailabilityForm
                {...{ ...data, schedule: { ...data.schedule, name: name || data.schedule.name } }}
              />
            </Shell>
          );
        }}
      />
    </div>
  );
}

export const getStaticProps: GetStaticProps = (ctx) => {
  const params = querySchema.safeParse(ctx.params);

  if (!params.success) return { notFound: true };

  return {
    props: {
      schedule: params.data.schedule,
    },
    revalidate: 10, // seconds
  };
};

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};
