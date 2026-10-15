import CreateContactModal from "../Components/CreateContactModal";

// Public contact form, opened by typing /city-lifestyle in the address bar
// (no login, no button). It is the same form as Contact List -> Create
// Contact, shown as a normal page and saved through the public API.
export default function PublicContactForm() {
  return <CreateContactModal publicMode onClose={() => {}} />;
}
