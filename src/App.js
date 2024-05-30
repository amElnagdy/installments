import { useEffect, useState } from "react";
import axios from "axios";
import Papa from "papaparse";
import { parse } from "date-fns";
import { Card, Row, Col, Typography } from "antd";

const { Title, Text } = Typography;

export default function App() {
  const [data, setData] = useState([]);
  const [nextPayment, setNextPayment] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    const url =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaHqj4DcMqTzY5EPS6U20Qhhg6_2wZQxNz1E8srJ1lItTcY1CujZXG5h7nwrFCXOu4zWifKQOgIyN1/pub?output=csv";
    axios
      .get(url)
      .then((response) => {
        const result = parseData(response.data);
        setData(result);
        findNextPayment(result);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const parseData = (csvData) => {
    const result = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });
    // Filter out entries with empty apartments
    return result.data.filter((entry) => entry.Apartment.trim() !== "");
  };

  const findNextPayment = (data) => {
    const today = new Date();
    const parsedData = data.map((payment) => {
      const dueDate = parse(payment["Due Date"], "dd-MM-yyyy", new Date());
      return { ...payment, "Due Date": dueDate };
    });

    const validData = parsedData.filter(
      (payment) => !isNaN(payment["Due Date"])
    );
    const upcomingPayments = validData.filter(
      (payment) => payment["Due Date"] >= today
    );
    const sortedData = upcomingPayments.sort(
      (a, b) => a["Due Date"] - b["Due Date"]
    );

    if (sortedData.length > 0) {
      setNextPayment(sortedData[0]);
    } else {
      setNextPayment(null);
    }

    setData(validData.sort((a, b) => a["Due Date"] - b["Due Date"]));
  };

  return (
    <div style={{ padding: "20px" }}>
      <Title level={2} style={{ textAlign: "center" }}>
         Installment Details
      </Title>

      {nextPayment && (
        <Card
          title={`Next Payment: Apartment ${nextPayment.Apartment}`}
          bordered={false}
          style={{ marginBottom: "20px" }}
        >
          <p>
            <Text strong>Due Date:</Text>{" "}
            {nextPayment["Due Date"].toLocaleDateString()}
          </p>
          <p>
            <Text strong>Total Amount:</Text> {nextPayment.Amount}
          </p>
          <p>
            <Text strong>Per Person:</Text> {nextPayment["Per Person"]}
          </p>
          <p>
            <Text strong>Check by:</Text> {nextPayment["Check by"]}
          </p>
          <p>
            <Text strong>Notes:</Text> {nextPayment.Notes || "None"}
          </p>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        {data.map((payment, index) => {
          const isPastDue = payment["Due Date"] < new Date();
          return (
            <Col span={8} key={index}>
              <Card
                title={`Apartment: ${payment.Apartment}`}
                bordered={false}
                style={{ backgroundColor: isPastDue ? "#AFE1AF" : "white" }}
              >
                <p>
                  <Text strong>Due Date:</Text>{" "}
                  {new Date(payment["Due Date"]).toLocaleDateString()}
                </p>
                <p>
                  <Text strong>Total Amount:</Text> {payment.Amount}
                </p>
                <p>
                  <Text strong>Per Person:</Text> {payment["Per Person"]}
                </p>
                <p>
                  <Text strong>Check by:</Text> {payment["Check by"]}
                </p>
                <p>
                  <Text strong>Notes:</Text> {payment.Notes || "None"}
                </p>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
