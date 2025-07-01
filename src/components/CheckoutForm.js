import React, { useState } from "react";
import PlacesAutocomplete, {
  geocodeByAddress,
} from "react-places-autocomplete";

export default function CheckoutForm() {
  const [address, setAddress] = useState("");
  const [manual, setManual] = useState(false);
  const [fields, setFields] = useState({
    street: "",
    city: "",
    zip: "",
    country: "",
  });

  const extractComponent = (components, type) => {
    const comp = components.find((c) => c.types.includes(type));
    return comp ? comp.long_name : "";
  };

  const handleSelect = async (val) => {
    setAddress(val);
    try {
      const results = await geocodeByAddress(val);
      const components = results[0].address_components;
      const streetNumber = extractComponent(components, "street_number");
      const route = extractComponent(components, "route");
      setFields({
        street: [streetNumber, route].filter(Boolean).join(" "),
        city: extractComponent(components, "locality"),
        zip: extractComponent(components, "postal_code"),
        country: extractComponent(components, "country"),
      });
    } catch (err) {
      console.error("Failed to parse address", err);
    }
  };

  const handleChange = (e) => {
    setFields({ ...fields, [e.target.name]: e.target.value });
  };

  return (
    <form>
      {!manual && (
        <div>
          <PlacesAutocomplete
            value={address}
            onChange={setAddress}
            onSelect={handleSelect}
          >
            {({
              getInputProps,
              suggestions,
              getSuggestionItemProps,
              loading,
            }) => (
              <div>
                <input
                  {...getInputProps({
                    placeholder: "Search address",
                    required: true,
                  })}
                />
                <div>
                  {loading && <div>Loading...</div>}
                  {suggestions.map((s) => (
                    <div key={s.placeId} {...getSuggestionItemProps(s)}>
                      {s.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </PlacesAutocomplete>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setManual(true);
            }}
          >
            Can't find your address? Enter it manually
          </a>
        </div>
      )}
      {manual && (
        <div>
          <label>
            Street
            <input
              name="street"
              value={fields.street}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            City
            <input
              name="city"
              value={fields.city}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            ZIP
            <input
              name="zip"
              value={fields.zip}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Country
            <input
              name="country"
              value={fields.country}
              onChange={handleChange}
              required
            />
          </label>
        </div>
      )}
      <input type="hidden" name="street" value={fields.street} />
      <input type="hidden" name="city" value={fields.city} />
      <input type="hidden" name="zip" value={fields.zip} />
      <input type="hidden" name="country" value={fields.country} />
      <button type="submit">Submit</button>
    </form>
  );
}
