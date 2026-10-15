import { useRef } from "react";
import { FaUser } from "react-icons/fa";

// Small round photo picker used for the contact's and the spouse's
// profile photo in CreateContactModal. It only reports what the admin
// chose (onPick / onRemove) — file validation and state live in the modal.
export default function ContactPhotoPicker({
  label,
  preview,
  onPick,
  onRemove,
  disabled = false,
}) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again after removing it still fires.
    e.target.value = "";
    if (file) onPick(file);
  };

  return (
    <div className="contactPhotoPicker">
      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        ref={inputRef}
        onChange={handleChange}
        hidden
      />

      <div className="contactPhotoCircle">
        {preview ? (
          <img src={preview} alt={label} />
        ) : (
          <FaUser className="contactPhotoPlaceholder" />
        )}
      </div>

      <div className="contactPhotoActions">
        <button
          type="button"
          className="contactPhotoButton"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          {preview ? "Change" : "Upload"}
        </button>

        {preview && (
          <button
            type="button"
            className="contactPhotoButton contactPhotoButtonRemove"
            onClick={onRemove}
            disabled={disabled}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
