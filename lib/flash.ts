import { cookies } from "next/headers";

const FLASH_COOKIE = "makerventory_flash";

export type FlashMessage = {
  type: "success" | "error";
  title: string;
  message?: string;
};

export async function setFlashMessage(flash: FlashMessage) {
  const store = await cookies();
  store.set(FLASH_COOKIE, JSON.stringify(flash), {
    path: "/",
    httpOnly: false,
    maxAge: 10,
    sameSite: "lax",
  });
}

export async function readFlashMessage() {
  const store = await cookies();
  const value = store.get(FLASH_COOKIE)?.value;

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as FlashMessage;
  } catch {
    return null;
  }
}
