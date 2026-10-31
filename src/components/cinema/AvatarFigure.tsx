export function AvatarFigure({
  shirtColor,
  bodyStyle,
  speaking = false,
}: {
  shirtColor: string;
  bodyStyle: "male" | "female";
  speaking?: boolean;
}) {
  return (
    <span className="seat__figure" aria-hidden="true">
      <span className={`avatar__head ${speaking ? "is-speaking" : ""}`}>
        <span
          className="avatar__hair"
          style={
            bodyStyle === "female"
              ? { width: 23, height: 14, borderRadius: "999px 999px 6px 6px" }
              : undefined
          }
        />
        {speaking ? (
          <span className="avatar__wave">
            <i />
            <i />
            <i />
          </span>
        ) : null}
      </span>
      <span
        className="avatar__shoulders"
        style={{ background: `linear-gradient(180deg, ${shirtColor}, ${shirtColor}bb)` }}
      />
    </span>
  );
}
