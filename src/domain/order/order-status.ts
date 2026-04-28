// Discriminated union — see §7.1 (TypeScript conventions). Carries
// status-specific payload (cancellation reason, ship timestamp,
// confirmation reservation) without optional fields scattered across
// the entity.
export type OrderStatus =
	| { readonly kind: "placed" }
	| {
			readonly kind: "confirmed";
			readonly reservationId: string;
			readonly at: string;
	  }
	| { readonly kind: "shipped"; readonly at: string }
	| {
			readonly kind: "cancelled";
			readonly reason: string;
			readonly at: string;
	  };
